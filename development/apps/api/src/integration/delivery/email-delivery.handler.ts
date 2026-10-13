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
  type NotificationTemplate,
} from '@sis/config';

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mock';
  from: string;
  fromName?: string;
  // SMTP config
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  // SendGrid config
  sendgridApiKey?: string;
  // Mock config (for tests)
  mockCapture?: (email: EmailMessage) => Promise<void>;
}

interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

/** Email delivery handler - sends via SMTP, SendGrid, or mock */
@Injectable()
export class EmailDeliveryHandler implements DeliveryHandler {
  readonly name = 'email';
  private readonly logger = new Logger(EmailDeliveryHandler.name);
  private config: EmailConfig;

  constructor() {
    // Configuration loaded from environment
    this.config = {
      provider: (process.env.EMAIL_PROVIDER as EmailConfig['provider']) ?? 'mock',
      from: process.env.EMAIL_FROM ?? 'noreply@sis.example.com',
      fromName: process.env.EMAIL_FROM_NAME ?? 'SIS Admissions',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      smtpSecure: process.env.SMTP_SECURE === 'true',
      sendgridApiKey: process.env.SENDGRID_API_KEY,
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
    'AssessmentAssigned',
  ];

  supports(eventType: string): boolean {
    return this.supportedTypes.includes(eventType);
  }

  getTarget(event: OutboxEvent): DeliveryTarget | null {
    const payload = event.payload as Record<string, unknown>;

    // Check for explicit email config in payload
    const emailTo = payload.emailTo as string | undefined;
    const templateKey = payload.templateKey as string | undefined;

    if (!emailTo || !templateKey) {
      return null;
    }

    const template = getNotificationTemplate(templateKey);
    if (!template) {
      this.logger.warn(`Unknown template key: ${templateKey} for event ${event.id}`);
      return null;
    }

    return {
      type: 'email',
      config: {
        to: emailTo,
        cc: payload.emailCc as string | undefined,
        bcc: payload.emailBcc as string | undefined,
        templateKey,
        templateVars: (payload.templateVars as Record<string, string>) ?? {},
        replyTo: payload.emailReplyTo as string | undefined,
      },
    };
  }

  async deliver(event: OutboxEvent, target: DeliveryTarget): Promise<DeliveryResult> {
    const config = target.config as {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      templateKey: string;
      templateVars: Record<string, string>;
      replyTo?: string;
    };

    const template = getNotificationTemplate(config.templateKey);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${config.templateKey}`,
        retryable: false, // Configuration error, not retryable
      };
    }

    // Render template with variables
    const rendered = renderTemplate(template, config.templateVars);

    const message: EmailMessage = {
      to: config.to,
      cc: config.cc,
      bcc: config.bcc,
      subject: rendered.subject,
      text: rendered.bodyText,
      html: rendered.bodyHtml,
      headers: {
        'X-SIS-Event-ID': event.id,
        'X-SIS-Event-Type': event.type,
        'X-SIS-Idempotency-Key': (event.payload as Record<string, unknown>).idempotencyKey as string ?? '',
        'X-SIS-Correlation-ID': (event.payload as Record<string, unknown>).correlationId as string ?? '',
      },
    };

    if (config.replyTo) {
      message.headers!['Reply-To'] = config.replyTo;
    }

    try {
      this.logger.log(`Sending email for event ${event.id} to ${Array.isArray(config.to) ? config.to.join(', ') : config.to}`);

      await this.sendEmail(message);

      this.logger.log(`Email sent successfully for event ${event.id}`);

      return {
        success: true,
        externalId: `email-${event.id}`,
      };
    } catch (error) {
      const errMsg = `Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logger.error(errMsg, error instanceof Error ? error.stack : undefined);

      // Most email errors are retryable (network, temporary failures)
      // But authentication/config errors are not
      const retryable = !this.isConfigError(error);

      return { success: false, error: errMsg, retryable };
    }
  }

  private async sendEmail(message: EmailMessage): Promise<void> {
    switch (this.config.provider) {
      case 'sendgrid':
        await this.sendViaSendGrid(message);
        break;
      case 'smtp':
        await this.sendViaSmtp(message);
        break;
      case 'mock':
      default:
        await this.sendViaMock(message);
        break;
    }
  }

  private async sendViaSendGrid(message: EmailMessage): Promise<void> {
    if (!this.config.sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Dynamic import to avoid dependency if not used
    const sgMail = await import('@sendgrid/mail').catch(() => null);
    if (!sgMail) {
      throw new Error('@sendgrid/mail not installed');
    }

    sgMail.default.setApiKey(this.config.sendgridApiKey);

    const msg = {
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      from: { email: this.config.from, name: this.config.fromName },
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: message.headers,
    };

    await sgMail.default.send(msg);
  }

  private async sendViaSmtp(message: EmailMessage): Promise<void> {
    if (!this.config.smtpHost || !this.config.smtpUser || !this.config.smtpPass) {
      throw new Error('SMTP configuration incomplete');
    }

    // Dynamic import to avoid dependency if not used
    const nodemailer = await import('nodemailer').catch(() => null);
    if (!nodemailer) {
      throw new Error('nodemailer not installed');
    }

    const transporter = nodemailer.default.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.from}>`,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: message.headers,
    });
  }

  private async sendViaMock(message: EmailMessage): Promise<void> {
    // In mock mode, just log the email (or capture if configured)
    this.logger.log(`[MOCK EMAIL] To: ${JSON.stringify(message.to)} Subject: ${message.subject}`);
    this.logger.debug(`[MOCK EMAIL] Text: ${message.text}`);
    this.logger.debug(`[MOCK EMAIL] HTML: ${message.html ?? '(none)'}`);

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
deliveryHandlerRegistry.register(new EmailDeliveryHandler());