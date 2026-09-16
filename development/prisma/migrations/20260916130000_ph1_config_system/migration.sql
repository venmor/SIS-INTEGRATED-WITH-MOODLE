-- Create ConfigurationItem table
CREATE TABLE "ConfigurationItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "value" JSONB NOT NULL,
    "valueType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "allowedValues" JSONB,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "ConfigurationItem_pkey" PRIMARY KEY ("id")
);

-- Create ConfigurationVersion table
CREATE TABLE "ConfigurationVersion" (
    "id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfigurationVersion_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "ConfigurationItem_key_key" ON "ConfigurationItem"("key");
CREATE INDEX "ConfigurationItem_category_subCategory_idx" ON "ConfigurationItem"("category", "subCategory");
CREATE INDEX "ConfigurationItem_key_idx" ON "ConfigurationItem"("key");

-- Seed all current SECURITY-v1 values as ConfigurationItems
-- Session configuration
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_session_absolute', 'security.session.absoluteSeconds', 'security', 'session', '43200', 'number', 'Absolute Session Lifetime (seconds)', 'Max session lifetime before forced re-auth', 300, 86400, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_session_idle', 'security.session.idleSeconds', 'security', 'session', '1800', 'number', 'Idle Timeout (seconds)', 'Inactivity timeout before session expiry', 60, 86400, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_session_cookie', 'security.session.cookieName', 'security', 'session', '"sid"', 'string', 'Session Cookie Name', 'Cookie name for session token', NULL, NULL, NULL, false, true, 1, NOW(), NOW(), 'system'),

-- Rate limits
('cfg_ratelimit_signin_max', 'security.rateLimit.signIn.maxAttempts', 'security', 'rateLimit.signIn', '5', 'number', 'Sign-in Max Attempts', 'Failed attempts before lockout', 1, 100, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_signin_window', 'security.rateLimit.signIn.windowMinutes', 'security', 'rateLimit.signIn', '15', 'number', 'Sign-in Window (minutes)', 'Time window for rate limiting', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_recovery_max', 'security.rateLimit.recovery.maxAttempts', 'security', 'rateLimit.recovery', '3', 'number', 'Recovery Max Attempts', 'Failed recovery attempts before lockout', 1, 100, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_recovery_window', 'security.rateLimit.recovery.windowMinutes', 'security', 'rateLimit.recovery', '60', 'number', 'Recovery Window (minutes)', 'Time window for recovery rate limiting', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_grant_max', 'security.rateLimit.grant.maxAttempts', 'security', 'rateLimit.grant', '20', 'number', 'Grant Max Attempts', 'Grant requests per window', 1, 1000, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_grant_window', 'security.rateLimit.grant.windowMinutes', 'security', 'rateLimit.grant', '60', 'number', 'Grant Window (minutes)', 'Time window for grant rate limiting', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_workspace_max', 'security.rateLimit.workspaceSwitch.maxAttempts', 'security', 'rateLimit.workspaceSwitch', '30', 'number', 'Workspace Switch Max Attempts', 'Workspace switches per window', 1, 1000, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_workspace_window', 'security.rateLimit.workspaceSwitch.windowMinutes', 'security', 'rateLimit.workspaceSwitch', '15', 'number', 'Workspace Switch Window (minutes)', 'Time window for workspace switch rate limiting', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_grantresolve_max', 'security.rateLimit.grantResolve.maxAttempts', 'security', 'rateLimit.grantResolve', '30', 'number', 'Grant Resolve Max Attempts', 'Grant resolve requests per window', 1, 1000, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_grantresolve_window', 'security.rateLimit.grantResolve.windowMinutes', 'security', 'rateLimit.grantResolve', '15', 'number', 'Grant Resolve Window (minutes)', 'Time window for grant resolve rate limiting', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_read_max', 'security.rateLimit.read.maxAttempts', 'security', 'rateLimit.read', '120', 'number', 'Read Max Attempts', 'Read requests per window', 1, 10000, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_read_window', 'security.rateLimit.read.windowMinutes', 'security', 'rateLimit.read', '1', 'number', 'Read Window (minutes)', 'Time window for read rate limiting', 1, 60, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Lockout
('cfg_lockout_failures', 'security.lockout.failuresBeforeLock', 'security', 'lockout', '5', 'number', 'Failures Before Lock', 'Failed attempts before account lockout', 1, 20, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_lockout_minutes', 'security.lockout.lockMinutes', 'security', 'lockout', '15', 'number', 'Lock Duration (minutes)', 'Account lock duration after max failures', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Grantor roles
('cfg_grantor_roles', 'security.grantorRoles', 'security', 'grantor', '["SYSADMIN"]', 'array', 'Grantor Roles', 'Roles allowed to grant roles', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Policy verbs (hardcoded mapping, not UI-configurable per policy decision)
('cfg_policy_verbs', 'security.policyVerbs', 'security', 'policy', '{"iam.grant.create":["SYSADMIN"],"iam.account.resolve":["SYSADMIN"],"iam.workspace.switch":["SYSADMIN","LEC","DEAN","STU","APP","TUT"],"iam.me.read":["SYSADMIN","LEC","DEAN","STU","APP","TUT"],"iam.break-glass.grant":["SYSADMIN"],"iam.review.decide":["SYSADMIN"],"iam.reinstate":["SYSADMIN"],"iam.expiry.daemon":["SYSADMIN"]}', 'object', 'Policy Verb Mapping', 'Action verb to allowed roles mapping', NULL, NULL, NULL, false, true, 1, NOW(), NOW(), 'system'),

-- SoD pairs (empty by default, configurable)
('cfg_sod_pairs', 'security.sodPairs', 'security', 'sod', '[]', 'array', 'SoD Conflicting Role Pairs', 'Mutually exclusive role pairs', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Password policy
('cfg_password_min', 'security.passwordPolicy.minLength', 'security', 'passwordPolicy', '12', 'number', 'Minimum Password Length', 'Minimum password length', 8, 128, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_password_guidance', 'security.passwordPolicy.guidance', 'security', 'passwordPolicy', '"Use at least 12 characters. A phrase with several words is easier to remember and stronger than a short complex word."', 'string', 'Password Guidance', 'Password strength guidance text', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Recovery
('cfg_recovery_token_minutes', 'security.recoveryTokenMinutes', 'security', 'recovery', '60', 'number', 'Recovery Token TTL (minutes)', 'Recovery token validity period in minutes', 5, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Slice-5 specific configs
('cfg_expiry_check_interval', 'security.expiryCheckIntervalMinutes', 'security', 'expiry', '1', 'number', 'Expiry Daemon Check Interval (minutes)', 'How often the expiry daemon checks for expired assignments', 1, 60, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_breakglass_max', 'security.breakGlassMaxMinutes', 'security', 'breakGlass', '25', 'number', 'Break-Glass Max Duration (minutes)', 'Maximum break-glass emergency access duration', 5, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_review_cadence_high', 'security.reviewCadence.high', 'security', 'review', '30', 'number', 'High Risk Review Cadence (days)', 'Days between reviews for high-risk roles', 1, 365, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_review_cadence_medium', 'security.reviewCadence.medium', 'security', 'review', '90', 'number', 'Medium Risk Review Cadence (days)', 'Days between reviews for medium-risk roles', 1, 365, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_review_cadence_low', 'security.reviewCadence.low', 'security', 'review', '180', 'number', 'Low Risk Review Cadence (days)', 'Days between reviews for low-risk roles', 1, 365, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_review_roles', 'security.reviewRoles', 'security', 'review', '["SYSADMIN","DEAN"]', 'array', 'Review Reviewer Roles', 'Roles allowed to perform reviews', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_expiry_warn_threshold', 'security.expiryWarningThresholdMinutes', 'security', 'expiry', '5', 'number', 'Expiry Warning Threshold (minutes)', 'Minutes before expiry to show warning', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_expiry_warn_ttl', 'security.expiryWarningTtlMinutes', 'security', 'expiry', '60', 'number', 'Expiry Warning TTL (minutes)', 'How long expiry warning stays visible after acknowledge', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Break-glass
('cfg_breakglass_approver_roles', 'security.breakGlass.approverRoles', 'security', 'breakGlass', '["SYSADMIN"]', 'array', 'Break-Glass Approver Roles', 'Roles allowed to approve break-glass requests', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system'),

-- Audit
('cfg_audit_retention', 'security.auditRetentionDays', 'security', 'audit', '365', 'number', 'Audit Retention (days)', 'Audit log retention period in days', 30, 2555, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_audit_export_formats', 'security.auditExportFormats', 'security', 'audit', '["json","csv"]', 'array', 'Audit Export Formats', 'Allowed export formats for audit logs', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');

-- ConfigurationVersion table
CREATE TABLE "ConfigurationVersion" (
    "id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConfigurationVersion_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ConfigurationItem_category_subCategory_idx" ON "ConfigurationItem"("category", "subCategory");
CREATE INDEX "ConfigurationItem_key_idx" ON "ConfigurationItem"("key");