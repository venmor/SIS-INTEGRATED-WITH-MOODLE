import { Injectable, Logger } from '@nestjs/common';
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

interface SmsConfig {
  provider: 'twilio' | 'mock';
  from: string;
  // Twilio config
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  // Mock config
  mockCapture?: (sms: SmsMessage) => Promise<void>;
}

interface SmsMessage {
  to: string;
  body: string;
  mediaUrl?: string[];
}

/** SMS delivery handler - sends via Twilio or mock */
@Injectable()
export class SmsDeliveryHandler implements DeliveryHandler {
  readonly name = 'sms';
  private readonly logger = new Logger(SmsDeliveryHandler.name);
  private config: SmsConfig;

  constructor() {
    this.config = {
      provider: (process.env.SMS_PROVIDER as SmsConfig['provider']) ?? 'mock',
      from: process.env.SMS_FROM ?? '+15550000000',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    };
  }

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
  ];

  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }

  getTarget(event: OutboxEvent): DeliveryTarget | null {
    const payload = event.payload as Record<string, unknown>;

    const smsTo = payload.smsTo as string | undefined;
    const templateKey = payload.templateKey as string | undefined;

    if (!smsTo || !templateKey) {
      return null;
    }

    const template = getNotificationTemplate(templateKey);
    if (!template || template.channel !== 'sms') {
      return null;
    }

    return {
      type: 'sms',
      config: {
        to: smsTo,
        templateKey,
        templateVars: (payload.templateVars as Record<string, string>) ?? {},
      },
    };
  }

  async deliver(event: OutboxEvent, target: DeliveryTarget): Promise<DeliveryResult> {
    const config = target.config as {
      to: string;
      templateKey: string;
      templateVars: Record<string, string>;
    };

    const template = getNotificationTemplate(config.templateKey);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${config.templateKey}`,
        retryable: false,
      };
    }

    // Render template - use text version for SMS
    const rendered = renderTemplate(template, config.templateVars);

    // SMS has length limits - truncate if needed
    const maxLength = 1600; // Support concatenated SMS
    const body = rendered.bodyText.length > maxLength
      ? rendered.bodyText.slice(0, maxLength - 3) + '...'
      : rendered.bodyText;

    const message: SmsMessage = {
      to: config.to,
      body,
    };

    try {
      this.logger.log(`Sending SMS for event ${event.id} to ${config.to}`);

      await this.sendSms(message);

      this.logger.log(`SMS sent successfully for event ${event.id}`);

      return {
        success: true,
        externalId: `sms-${event.id}`,
      };
    } catch (error) {
      const errMsg = `SMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errMsg, error instanceof Error ? error.stack : undefined);

      // Most SMS errors are retryable
      const retryable = !this.isConfigError(error);

      return { success: false, error: errMsg, retryable };
    }
  }

  private async sendSms(message: SmsMessage): Promise<void> {
    switch (this.config.provider) {
      case 'twilio':
        await this.sendViaTwilio(message);
        break;
      case 'mock':
      default:
        await this.sendViaMock(message);
        break;
    }
  }

  private async sendViaTwilio(message: SmsMessage): Promise<void> {
    if (!this.config.twilioAccountSid || !this.config.twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Dynamic import to avoid dependency if not used
    const twilio = await import('twilio').catch(() => null);
    if (!twilio) {
      throw new Error('twilio not installed');
    }

    const client = twilio.default(this.config.twilioAccountSid, this.config.twilioAuthToken);

    await client.messages.create({
      body: message.body,
      from: this.config.from,
      to: message.to,
      mediaUrl: message.mediaUrl,
    });
  }

  private async sendViaMock(message: SmsMessage): Promise<void> {
    this.logger.log(`[MOCK SMS] To: ${message.to} Body: ${message.body}`);

    if (this.config.mockCapture) {
      await this.config.mockCapture(message);
    }
  }

  private isConfigError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('authentication') ||
      msg.includes('unauthorized') ||
      msg.includes('invalid') ||
      msg.includes('not configured') ||
      msg.includes('not installed')
    );
  }
}

// Auto-register the handler
deliveryHandlerRegistry.register(new SmsDeliveryHandler());