/** Notification templates for applicant and staff workflows (Task 1.6).
 * Fictional demo templates — not UNZA policy. Templates are versioned
 * alongside the config package and rendered by delivery handlers.
 *
 * Each template defines:
 * - key: unique identifier used to select the template
 * - channel: primary delivery channel (email | sms | internal | webhook)
 * - subject: for email/internal notifications
 * - bodyText: plain text version (required for SMS, fallback for email)
 * - bodyHtml: HTML version (email only)
 * - requiredVars: variables that must be present in the payload
 * - description: human-readable purpose for ops reference
 */

export type NotificationChannel = 'email' | 'sms' | 'internal' | 'webhook';

export interface NotificationTemplate {
  readonly key: string;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly bodyText: string;
  readonly bodyHtml?: string;
  readonly requiredVars: readonly string[];
  readonly description: string;
}

/** Applicant-facing notification templates */
export const APPLICANT_NOTIFICATION_TEMPLATES: readonly NotificationTemplate[] = [
  {
    key: 'APPLICATION_SUBMITTED',
    channel: 'email',
    subject: 'Application Submitted — {{reference}}',
    bodyText: `Dear {{applicantName}},

Your application (reference: {{reference}}) for {{programmeName}} ({{intake}}) has been received and is now under review.

Submitted at: {{submittedAt}}
Application reference: {{reference}}

You can track your application status at any time by signing in to the applicant portal.

— Admissions Office`,
    bodyHtml: `<p>Dear {{applicantName}},</p>
<p>Your application (reference: <strong>{{reference}}</strong>) for <strong>{{programmeName}}</strong> ({{intake}}) has been received and is now under review.</p>
<p>Submitted at: {{submittedAt}}<br>
Application reference: {{reference}}</p>
<p>You can track your application status at any time by signing in to the applicant portal.</p>
<p>— Admissions Office</p>`,
    requiredVars: ['applicantName', 'reference', 'programmeName', 'intake', 'submittedAt'],
    description: 'Sent to applicant when application is submitted',
  },
  {
    key: 'CLARIFICATION_REQUESTED',
    channel: 'email',
    subject: 'Clarification Required — Application {{reference}}',
    bodyText: `Dear {{applicantName}},

We need some additional information to continue processing your application (reference: {{reference}}) for {{programmeName}}.

Clarification requested:
{{clarificationQuestion}}

Please respond by: {{deadline}}

You can provide your response by signing in to the applicant portal.

— Admissions Office`,
    bodyHtml: `<p>Dear {{applicantName}},</p>
<p>We need some additional information to continue processing your application (reference: <strong>{{reference}}</strong>) for <strong>{{programmeName}}</strong>.</p>
<p><strong>Clarification requested:</strong></p>
<p>{{clarificationQuestion}}</p>
<p><strong>Please respond by:</strong> {{deadline}}</p>
<p>You can provide your response by signing in to the applicant portal.</p>
<p>— Admissions Office</p>`,
    requiredVars: ['applicantName', 'reference', 'programmeName', 'clarificationQuestion', 'deadline'],
    description: 'Sent to applicant when admissions requests clarification',
  },
  {
    key: 'CORRECTION_REQUESTED',
    channel: 'email',
    subject: 'Correction Required — Application {{reference}}',
    bodyText: `Dear {{applicantName}},

A correction is needed on your application (reference: {{reference}}) for {{programmeName}}.

Section: {{section}}
Field: {{field}}
Reason: {{reason}}

Please make the correction by: {{deadline}}

You can update your application by signing in to the applicant portal.

— Admissions Office`,
    bodyHtml: `<p>Dear {{applicantName}},</p>
<p>A correction is needed on your application (reference: <strong>{{reference}}</strong>) for <strong>{{programmeName}}</strong>.</p>
<p><strong>Section:</strong> {{section}}<br>
<strong>Field:</strong> {{field}}<br>
<strong>Reason:</strong> {{reason}}</p>
<p><strong>Please make the correction by:</strong> {{deadline}}</p>
<p>You can update your application by signing in to the applicant portal.</p>
<p>— Admissions Office</p>`,
    requiredVars: ['applicantName', 'reference', 'programmeName', 'section', 'field', 'reason', 'deadline'],
    description: 'Sent to applicant when a correction is requested',
  },
  {
    key: 'DECISION_RELEASED',
    channel: 'email',
    subject: 'Decision Released — Application {{reference}}',
    bodyText: `Dear {{applicantName}},

A decision has been released for your application (reference: {{reference}}) for {{programmeName}}.

Outcome: {{outcome}}
{{#if message}}
Message: {{message}}
{{/if}}
{{#if conditions}}
Conditions:
{{conditions}}
{{/if}}

{{#if acceptBy}}
You must respond by: {{acceptBy}}
{{/if}}

View the full decision and respond by signing in to the applicant portal.

— Admissions Office`,
    bodyHtml: `<p>Dear {{applicantName}},</p>
<p>A decision has been released for your application (reference: <strong>{{reference}}</strong>) for <strong>{{programmeName}}</strong>.</p>
<p><strong>Outcome:</strong> {{outcome}}</p>
{{#if message}}<p><strong>Message:</strong> {{message}}</p>{{/if}}
{{#if conditions}}<p><strong>Conditions:</strong><br>{{conditions}}</p>{{/if}}
{{#if acceptBy}}<p><strong>You must respond by:</strong> {{acceptBy}}</p>{{/if}}
<p>View the full decision and respond by signing in to the applicant portal.</p>
<p>— Admissions Office</p>`,
    requiredVars: ['applicantName', 'reference', 'programmeName', 'outcome'],
    description: 'Sent to applicant when a decision is released',
  },
  {
    key: 'OFFER_RELEASED',
    channel: 'email',
    subject: 'Offer Released — Application {{reference}}',
    bodyText: `Dear {{applicantName}},

Congratulations! An offer has been released for your application (reference: {{reference}}) for {{programmeName}}.

Offer details:
- Programme: {{programmeName}}
- Intake: {{intake}}
- Study mode: {{studyMode}}
- Campus: {{campus}}
{{#if conditions}}
Conditions:
{{conditions}}
{{/if}}

You must accept or decline this offer by: {{acceptBy}}

To accept or decline, sign in to the applicant portal.

— Admissions Office`,
    bodyHtml: `<p>Dear {{applicantName}},</p>
<p>Congratulations! An offer has been released for your application (reference: <strong>{{reference}}</strong>) for <strong>{{programmeName}}</strong>.</p>
<p><strong>Offer details:</strong></p>
<ul>
<li>Programme: {{programmeName}}</li>
<li>Intake: {{intake}}</li>
<li>Study mode: {{studyMode}}</li>
<li>Campus: {{campus}}</li>
</ul>
{{#if conditions}}<p><strong>Conditions:</strong><br>{{conditions}}</p>{{/if}}
<p><strong>You must accept or decline this offer by:</strong> {{acceptBy}}</p>
<p>To accept or decline, sign in to the applicant portal.</p>
<p>— Admissions Office</p>`,
    requiredVars: ['applicantName', 'reference', 'programmeName', 'intake', 'studyMode', 'campus', 'acceptBy'],
    description: 'Sent to applicant when an offer is released',
  },
  {
    key: 'WITHDRAWAL_CONFIRMED',
    channel: 'email',
    subject: 'Withdrawal Confirmed — Application {{reference}}',
    bodyText: `Dear {{applicantName}},

Your withdrawal request for application (reference: {{reference}}) for {{programmeName}} has been processed.

Withdrawn at: {{withdrawnAt}}
Reason: {{reason}}

Your application is now closed. If you wish to apply in the future, you may submit a new application.

— Admissions Office`,
    bodyHtml: `<p>Dear {{applicantName}},</p>
<p>Your withdrawal request for application (reference: <strong>{{reference}}</strong>) for <strong>{{programmeName}}</strong> has been processed.</p>
<p><strong>Withdrawn at:</strong> {{withdrawnAt}}<br>
<strong>Reason:</strong> {{reason}}</p>
<p>Your application is now closed. If you wish to apply in the future, you may submit a new application.</p>
<p>— Admissions Office</p>`,
    requiredVars: ['applicantName', 'reference', 'programmeName', 'withdrawnAt', 'reason'],
    description: 'Sent to applicant when withdrawal is confirmed',
  },
  {
    key: 'STUDENT_CONVERSION',
    channel: 'email',
    subject: 'Welcome! Your Student Account — {{studentNumber}}',
    bodyText: `Dear {{studentName}},

Congratulations on your admission! Your student account has been created.

Student number: {{studentNumber}}
Programme: {{programmeName}}
Intake: {{intake}}

Your temporary password is: {{temporaryPassword}}

Please sign in at the student portal and change your password immediately.

— Student Records Office`,
    bodyHtml: `<p>Dear {{studentName}},</p>
<p>Congratulations on your admission! Your student account has been created.</p>
<p><strong>Student number:</strong> {{studentNumber}}<br>
<strong>Programme:</strong> {{programmeName}}<br>
<strong>Intake:</strong> {{intake}}</p>
<p><strong>Your temporary password is:</strong> {{temporaryPassword}}</p>
<p>Please sign in at the student portal and change your password immediately.</p>
<p>— Student Records Office</p>`,
    requiredVars: ['studentName', 'studentNumber', 'programmeName', 'intake', 'temporaryPassword'],
    description: 'Sent to new student on conversion from applicant',
  },
];

/** Staff-facing notification templates */
export const STAFF_NOTIFICATION_TEMPLATES: readonly NotificationTemplate[] = [
  {
    key: 'STAFF_ASSESSMENT_ASSIGNED',
    channel: 'internal',
    subject: 'Assessment Assigned — Application {{reference}}',
    bodyText: `You have been assigned to assess application {{reference}}.

Applicant: {{applicantName}}
Programme: {{programmeName}}
Intake: {{intake}}
Assigned at: {{assignedAt}}
Due by: {{dueBy}}

Open the admissions workspace to begin your assessment.`,
    bodyHtml: `<p>You have been assigned to assess application <strong>{{reference}}</strong>.</p>
<p><strong>Applicant:</strong> {{applicantName}}<br>
<strong>Programme:</strong> {{programmeName}}<br>
<strong>Intake:</strong> {{intake}}<br>
<strong>Assigned at:</strong> {{assignedAt}}<br>
<strong>Due by:</strong> {{dueBy}}</p>
<p>Open the admissions workspace to begin your assessment.</p>`,
    requiredVars: ['reference', 'applicantName', 'programmeName', 'intake', 'assignedAt', 'dueBy'],
    description: 'Internal notification to admissions officer when assessment is assigned',
  },
];

/** All templates combined for easy lookup */
export const ALL_NOTIFICATION_TEMPLATES: readonly NotificationTemplate[] = [
  ...APPLICANT_NOTIFICATION_TEMPLATES,
  ...STAFF_NOTIFICATION_TEMPLATES,
];

/** Lookup template by key */
export function getNotificationTemplate(key: string): NotificationTemplate | undefined {
  return ALL_NOTIFICATION_TEMPLATES.find((t) => t.key === key);
}

/** Render template with variables (simple {{var}} substitution) */
export function renderTemplate(
  template: NotificationTemplate,
  vars: Record<string, string>,
): { subject: string; bodyText: string; bodyHtml?: string } {
  const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  const bodyText = template.bodyText.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  const bodyHtml = template.bodyHtml?.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

  // Handle simple conditionals {{#if var}}...{{/if}}
  const processConditionals = (text: string): string => {
    return text.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      return vars[key] ? content : '';
    });
  };

  return {
    subject: processConditionals(subject),
    bodyText: processConditionals(bodyText),
    bodyHtml: bodyHtml ? processConditionals(bodyHtml) : undefined,
  };
}

export type { NotificationTemplate as NotificationTemplateType };