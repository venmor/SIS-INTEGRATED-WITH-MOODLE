-- Seed production application configuration (APPLICATION-PRODUCTION-v1)
-- This migration adds the production configuration values to the ConfigurationItem table.
-- Values marked with 'TODO: Business owner to approve' in the source config must be
-- reviewed and approved by the relevant business owners before production use.

-- Application policy version
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_version', 'application.version', 'application', 'policy', '"APPLICATION-PRODUCTION-v1"', 'string', 'Application Policy Version', 'Version identifier for the application policy', NULL, NULL, NULL, false, true, 1, NOW(), NOW(), 'system');

-- Demo flag (read-only, set by environment)
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_demo', 'application.demo', 'application', 'policy', 'false', 'boolean', 'Demo Mode', 'Whether the application is running in demo mode', NULL, NULL, NULL, false, true, 1, NOW(), NOW(), 'system');

-- Timezone
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_timezone', 'application.timezone', 'application', 'policy', '"Africa/Lusaka"', 'string', 'Application Timezone', 'Timezone for date/time display and deadlines', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Max active applications per intake
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_max_active', 'application.maxActivePerIntake', 'application', 'policy', '1', 'number', 'Max Active Applications Per Intake', 'Maximum number of active applications a single applicant can have per intake. TODO: Business owner to approve.', 1, 10, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Max choices per application
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_max_choices', 'application.maxChoices', 'application', 'policy', '3', 'number', 'Max Programme Choices', 'Maximum number of programme choices per application. TODO: Business owner to approve.', 1, 10, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Fee configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_fee_status', 'application.fee.status', 'application', 'fee', '"REQUIRED"', 'string', 'Fee Status', 'Whether application fee is required', NULL, NULL, '["NOT_REQUIRED","REQUIRED"]', false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_fee_amount_minor', 'application.fee.amountMinor', 'application', 'fee', '150000', 'number', 'Application Fee Amount (minor units)', 'Application fee in minor currency units (tambala for ZMW). TODO: Business owner to approve.', 0, 1000000, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_fee_currency', 'application.fee.currency', 'application', 'fee', '"ZMW"', 'string', 'Application Fee Currency', 'Currency code for application fee', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_fee_explanation', 'application.fee.explanation', 'application', 'fee', '"A non-refundable application fee is required to process your application. Payment must be completed before submission."', 'string', 'Fee Explanation', 'Explanation shown to applicants about the fee', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Contact requirement
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_contact_req', 'application.contactRequirement', 'application', 'policy', '"At least one verified email address and one verified mobile number are required."', 'string', 'Contact Requirement', 'Minimum contact verification requirement for applicants', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Upload configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_upload_max_bytes', 'application.upload.maxBytes', 'application', 'upload', '10485760', 'number', 'Max Upload Size (bytes)', 'Maximum file upload size in bytes', 1048576, 52428800, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_upload_mime_types', 'application.upload.mimeTypes', 'application', 'upload', '["application/pdf","image/jpeg","image/png"]', 'array', 'Allowed MIME Types', 'Allowed MIME types for document uploads', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_upload_extensions', 'application.upload.extensions', 'application', 'upload', '["pdf","jpg","jpeg","png"]', 'array', 'Allowed File Extensions', 'Allowed file extensions for document uploads', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_upload_min_stage', 'application.upload.minimumStage', 'application', 'upload', '"AwaitingQualityCheck"', 'string', 'Minimum Upload Stage', 'Minimum application stage before uploads are allowed', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_upload_scanner', 'application.upload.scanner', 'application', 'upload', '"ClamAV plus PDF structural validation; production documents only."', 'string', 'Document Scanner', 'Scanner configuration for uploaded documents', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Rate limits
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_ratelimit_general', 'application.rateLimit.generalPerMinute', 'application', 'rateLimit', '60', 'number', 'General Rate Limit (per minute)', 'General API requests per minute', 1, 1000, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_ratelimit_docs', 'application.rateLimit.documentsPerMinute', 'application', 'rateLimit', '10', 'number', 'Document Upload Rate Limit (per minute)', 'Document upload requests per minute', 1, 100, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_ratelimit_window', 'application.rateLimit.windowMinutes', 'application', 'rateLimit', '1', 'number', 'Rate Limit Window (minutes)', 'Time window for rate limiting in minutes', 1, 60, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Autosave delay
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_autosave_delay', 'application.autosaveDelayMs', 'application', 'policy', '2000', 'number', 'Autosave Delay (ms)', 'Delay before autosaving draft changes', 500, 10000, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Help text
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_help', 'application.help', 'application', 'policy', '"Contact the Admissions Office at admissions@unza.zm or +260-211-XXXXXXX for assistance."', 'string', 'Help Text', 'Help text shown to applicants', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Case configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_case_status_poll', 'application.case.statusPollMs', 'application', 'case', '30000', 'number', 'Status Poll Interval (ms)', 'Client polling interval for status updates', 5000, 120000, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_case_clarification_days', 'application.case.clarificationResponseDays', 'application', 'case', '14', 'number', 'Clarification Response Days', 'Days allowed for applicant to respond to clarification requests', 1, 90, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_case_correction_note', 'application.case.correctionReviewNote', 'application', 'case', '"Corrections require an Admissions decision. The submitted application remains unchanged until approval is granted."', 'string', 'Correction Review Note', 'Note shown when correction review is needed', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_case_withdrawal_note', 'application.case.withdrawalConfirmation', 'application', 'case', '"Withdrawing ends assessment of this application. This does not request a refund of the application fee."', 'string', 'Withdrawal Confirmation', 'Confirmation text for application withdrawal', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_case_support_channels', 'application.case.supportChannels', 'application', 'case', '["Admissions","Technical access","Documents","Decision","Fee payment"]', 'array', 'Support Channels', 'Available support channels for applicants', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_case_notification_retention', 'application.case.notificationRetentionDays', 'application', 'case', '180', 'number', 'Notification Retention (days)', 'Days to retain applicant notifications', 30, 365, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Qualifications configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_qual_min_year', 'application.qualifications.minimumYear', 'application', 'qualifications', '1980', 'number', 'Minimum Qualification Year', 'Earliest allowed qualification year', 1950, 2030, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_qual_allow_awaiting', 'application.qualifications.allowAwaiting', 'application', 'qualifications', 'true', 'boolean', 'Allow Awaiting Results', 'Whether applicants can submit awaiting results', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_qual_awaiting_expiry', 'application.qualifications.awaitingExpiryMonths', 'application', 'qualifications', '12', 'number', 'Awaiting Results Expiry (months)', 'Months before awaiting results expire', 1, 24, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Review criteria configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_review_criteria_version', 'application.review.criteriaVersion', 'application', 'review', '"PROD-CRITERIA-v1"', 'string', 'Review Criteria Version', 'Version identifier for review criteria', NULL, NULL, NULL, false, true, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_review_scoring_max', 'application.review.scoring.maxScore', 'application', 'review', '100', 'number', 'Maximum Review Score', 'Maximum possible score in review assessment', 50, 1000, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_review_scoring_eligible', 'application.review.scoring.eligibleThreshold', 'application', 'review', '70', 'number', 'Eligibility Threshold', 'Minimum score for ELIGIBLE outcome. TODO: Business owner to approve.', 0, 100, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_review_scoring_favourable', 'application.review.scoring.favourableThreshold', 'application', 'review', '80', 'number', 'Favourable Recommendation Threshold', 'Minimum score for FAVOURABLE recommendation. TODO: Business owner to approve.', 0, 100, NULL, false, false, 1, NOW(), NOW(), 'system');

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_review_scoring_needs_info', 'application.review.scoring.needsInfoThreshold', 'application', 'review', '50', 'number', 'Needs Information Threshold', 'Minimum score for NEEDS_INFORMATION recommendation. TODO: Business owner to approve.', 0, 100, NULL, false, false, 1, NOW(), NOW(), 'system');

-- Offer configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_app_offer_version', 'application.offer.version', 'application', 'offer', '"PROD-OFFER-v1"', 'string', 'Offer Policy Version', 'Version identifier for offer acceptance policy', NULL, NULL, NULL, false, true, 1, NOW(), NOW(), 'system');

-- Create initial ConfigurationVersion snapshot
INSERT INTO "ConfigurationVersion" ("id", "snapshot", "changedBy", "changeReason", "createdAt") VALUES
('cfg_ver_app_prod_v1',
 '{"application": {"version": "APPLICATION-PRODUCTION-v1", "demo": false, "timezone": "Africa/Lusaka", "maxActivePerIntake": 1, "maxChoices": 3, "fee": {"status": "REQUIRED", "amountMinor": 150000, "currency": "ZMW", "explanation": "A non-refundable application fee is required to process your application. Payment must be completed before submission."}, "contactRequirement": "At least one verified email address and one verified mobile number are required.", "upload": {"maxBytes": 10485760, "mimeTypes": ["application/pdf","image/jpeg","image/png"], "extensions": ["pdf","jpg","jpeg","png"], "minimumStage": "AwaitingQualityCheck", "scanner": "ClamAV plus PDF structural validation; production documents only."}, "rateLimit": {"generalPerMinute": 60, "documentsPerMinute": 10, "windowMinutes": 1}, "autosaveDelayMs": 2000, "help": "Contact the Admissions Office at admissions@unza.zm or +260-211-XXXXXXX for assistance.", "case": {"statusPollMs": 30000, "clarificationResponseDays": 14, "correctionReviewNote": "Corrections require an Admissions decision. The submitted application remains unchanged until approval is granted.", "withdrawalConfirmation": "Withdrawing ends assessment of this application. This does not request a refund of the application fee.", "supportChannels": ["Admissions","Technical access","Documents","Decision","Fee payment"], "notificationRetentionDays": 180}, "qualifications": {"minimumYear": 1980, "allowAwaiting": true, "awaitingExpiryMonths": 12}, "review": {"criteriaVersion": "PROD-CRITERIA-v1", "scoring": {"maxScore": 100, "eligibleThreshold": 70, "favourableThreshold": 80, "needsInfoThreshold": 50}}, "offer": {"version": "PROD-OFFER-v1"}}}',
 'system',
 'Initial production application configuration (APPLICATION-PRODUCTION-v1)',
 NOW());