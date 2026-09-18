-- TASK-PH2-001 (review fix): guidance-session TTL key. Split out because
-- the catalogue-config migration already applied to dev databases.

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_catalogue_session_ttl', 'catalogue.sessionTtlMinutes', 'catalogue', 'session', '30', 'number', 'Guidance Session TTL (minutes)', 'Transient anonymous guidance-session lifetime', 5, 120, NULL, false, false, 1, NOW(), NOW(), 'system');
