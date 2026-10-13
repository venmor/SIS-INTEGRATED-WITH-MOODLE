import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../identity-access/prisma.service.js';
import { OutboxEvent } from '@prisma/client';
import {
  DeliveryHandler,
  DeliveryResult,
  DeliveryTarget,
  deliveryHandlerRegistry,
} from './delivery.handler.js';
import {
  getNotificationTemplate,
  renderTemplate,
} from '@sis/config';

/** Internal delivery handler - creates in-system Notification entity */
@Injectable()
export class InternalDeliveryHandler implements DeliveryHandler {
  readonly name = 'internal';
  private readonly logger = new Logger(InternalDeliveryHandler.name);

  constructor(private readonly prisma: PrismaService) {}

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

    const recipientAccountId = payload.recipientAccountId as string | undefined;
    const templateKey = payload.templateKey as string | undefined;

    if (!recipientAccountId || !templateKey) {
      return null;
    }

    const template = getNotificationTemplate(templateKey);
    if (!template || template.channel !== 'internal') {
      return null;
    }

    return {
      type: 'internal',
      config: {
        recipientAccountId,
        templateKey,
        templateVars: (payload.templateVars as Record<string, string>) ?? {},
        applicationId: payload.applicationId as string | undefined,
        relatedEntityType: payload.relatedEntityType as string | undefined,
        relatedEntityId: payload.relatedEntityId as string | undefined,
      },
    };
  }

  async deliver(event: OutboxEvent, target: DeliveryTarget): Promise<DeliveryResult> {
    const config = target.config as {
      recipientAccountId: string;
      templateKey: string;
      templateVars: Record<string, string>;
      applicationId?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    };

    const template = getNotificationTemplate(config.templateKey);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${config.templateKey}`,
        retryable: false,
      };
    }

    // Render template
    const rendered = renderTemplate(template, config.templateVars);

    try {
      this.logger.log(`Creating internal notification for event ${event.id} to account ${config.recipientAccountId}`);

      // Create the notification in the database
      const notification = await this.prisma.applicantNotification.create({
        data: {
          accountId: config.recipientAccountId,
          applicationId: config.applicationId,
          type: config.templateKey,
          title: rendered.subject,
          payload: {
            bodyText: rendered.bodyText,
            bodyHtml: rendered.bodyHtml,
            templateKey: config.templateKey,
            templateVars: config.templateVars,
            relatedEntityType: config.relatedEntityType,
            relatedEntityId: config.relatedEntityId,
            eventId: event.id,
            correlationId: (event.payload as Record<string, unknown>).correlationId ?? null,
          },
        },
      });

      this.logger.log(`Internal notification created for event ${event.id}: ${notification.id}`);

      return {
        success: true,
        externalId: notification.id,
      };
    } catch (error) {
      const errMsg = `Internal notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errMsg, error instanceof Error ? error.stack : undefined);

      // Database errors might be retryable
      const retryable = this.isRetryableError(error);

      return { success: false, error: errMsg, retryable };
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('connection') ||
      msg.includes('timeout') ||
      msg.includes('deadlock') ||
      msg.includes('temporary')
    );
  }
}