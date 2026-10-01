export { SECURITY_V1 } from "./security.js";
export type { SecurityConfig } from "./security.js";
export { CATALOGUE_V1 } from "./catalogue.js";
export type { CatalogueConfig } from "./catalogue.js";
export { AUTH_MESSAGES } from "./messages.js";
export type { MessageTemplate, AuthMessageKey } from "./messages.js";
export * from "./configuration.js";
export { APPLICATION_DEMO_V1 } from "./applications.js";
export { getApplicationPolicy, getApplicationPolicySync } from "./applications.js";
export type { } from "./applications.js";
export { STUDENT_DEMO_V1 } from "./students.js";
export { FINANCE_DEMO_V1 } from "./finance.js";
export { TEACHING_DEMO_V1 } from "./teaching.js";
export { ASSESSMENT_DEMO_V1 } from "./assessment.js";
export { MOODLE_DEMO_V1, MOODLE_LIVE_V1 } from "./moodle.js";
export {
  ALL_NOTIFICATION_TEMPLATES,
  APPLICANT_NOTIFICATION_TEMPLATES,
  STAFF_NOTIFICATION_TEMPLATES,
  getNotificationTemplate,
  renderTemplate,
  type NotificationTemplate,
  type NotificationChannel,
} from "./notifications.js";
