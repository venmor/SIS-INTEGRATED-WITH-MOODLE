import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { OutboxEvent } from '@prisma/client';
import { DeliveryHandler, DeliveryResult, DeliveryTarget, deliveryHandlerRegistry } from './delivery.handler.js';

interface WebhookConfig {
  url: string;
  secret: string;           // HMAC secret for signing
  timeoutMs?: number;       // Request timeout
  headers?: Record<string, string>; // Additional headers
}

/** Webhook delivery handler - POSTs to configured URL with HMAC-SHA256 signature */
@Injectable()
export class WebhookDeliveryHandler implements DeliveryHandler {
  readonly name = 'webhook';
  private readonly logger = new Logger(WebhookDeliveryHandler.name);

  /** Event types this handler supports */
  private readonly supportedTypes = [
    'ApplicantNotification',
    'StaffNotification',
    'ApplicationSubmitted',
    'ClarificationRequested',
    'CorrectionRequested',
    'DecisionReleased',
    'OfferReleased',
    'WithdrawalConfirmed',
    'StudentConversion',
    'AssessmentAssigned',
  ];

  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }

  getTarget(event: OutboxEvent): DeliveryTarget | null {
    const payload = event.payload as Record<string, unknown>;
    const webhookUrl = payload.webhookUrl as string | undefined;
    const webhookSecret = payload.webhookSecret as string | undefined;

    if (!webhookUrl || !webhookSecret) {
      return null;
    }

    return {
      type: 'webhook',
      config: {
        url: webhookUrl,
        secret: webhookSecret,
        timeoutMs: (payload.webhookTimeoutMs as number) ?? 10000,
        headers: (payload.webhookHeaders as Record<string, string>) ?? {},
      },
    };
  }

  async deliver(event: OutboxEvent, target: DeliveryTarget): Promise<DeliveryResult> {
    const config = target.config as unknown as WebhookConfig;
    const payload = event.payload as Record<string, unknown>;

    // Build the webhook payload
    const webhookPayload = {
      eventId: event.id,
      eventType: event.type,
      occurredAt: event.occurredAt.toISOString(),
      aggregate: event.aggregate,
      aggregateId: event.aggregateId,
      payload: payload.data ?? payload,
      idempotencyKey: payload.idempotencyKey,
      correlationId: payload.correlationId,
    };

    const body = JSON.stringify(webhookPayload);

    // Generate HMAC-SHA256 signature
    const signature = createHmac('sha256', config.secret).update(body).digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-SIS-Event-ID': event.id,
      'X-SIS-Event-Type': event.type,
      'X-SIS-Signature': `sha256=${signature}`,
      'X-SIS-Idempotency-Key': payload.idempotencyKey as string ?? '',
      'X-SIS-Correlation-ID': payload.correlationId as string ?? '',
      'User-Agent': 'SIS-Integration/1.0',
      ...config.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs ?? 10000);

    try {
      this.logger.log(`Delivering webhook for event ${event.id} to ${config.url}`);

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      if (!response.ok) {
        const error = `Webhook delivery failed: ${response.status} ${response.statusText} - ${responseText.slice(0, 500)}`;
        this.logger.warn(error);

        // Determine if retryable based on status code
        const retryable = response.status >= 500 || response.status === 429;

        return {
          success: false,
          error,
          retryable,
          metadata: { statusCode: response.status, responseBody: responseText.slice(0, 1000) },
        };
      }

      this.logger.log(`Webhook delivered successfully for event ${event.id}`);

      return {
        success: true,
        externalId: response.headers.get('x-request-id') ?? undefined,
        metadata: { statusCode: response.status, responseBody: responseText.slice(0, 1000) },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const errMsg = `Webhook timeout after ${config.timeoutMs}ms`;
        this.logger.warn(errMsg);
        return { success: false, error: errMsg, retryable: true };
      }

      const errMsg = `Webhook delivery error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errMsg, error instanceof Error ? error.stack : undefined);

      // Network errors are typically retryable
      return { success: false, error: errMsg, retryable: true };
    }
  }
}

// Auto-register the handler
deliveryHandlerRegistry.register(new WebhookDeliveryHandler());