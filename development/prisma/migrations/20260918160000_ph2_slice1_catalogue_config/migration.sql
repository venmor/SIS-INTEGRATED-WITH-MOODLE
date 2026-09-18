-- TASK-PH2-001: catalogue demo configuration keys (CATALOGUE-v1) and the
-- public catalogue-search rate-limit row (SECURITY-v1 addition). Demo values,
-- labelled packet-local; handbook threat model requires search abuse limits
-- but names no anonymous row.

INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_ratelimit_catsearch_max', 'security.rateLimit.catalogueSearch.maxAttempts', 'security', 'rateLimit.catalogueSearch', '60', 'number', 'Catalogue Search Max Attempts', 'Anonymous catalogue search/evaluate requests per window per IP (demo value, packet-local)', 1, 10000, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_ratelimit_catsearch_window', 'security.rateLimit.catalogueSearch.windowMinutes', 'security', 'rateLimit.catalogueSearch', '1', 'number', 'Catalogue Search Window (minutes)', 'Time window for catalogue search rate limiting', 1, 1440, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_catalogue_take_default', 'catalogue.search.defaultTake', 'catalogue', 'search', '12', 'number', 'Catalogue Default Page Size', 'Default result count for programme search', 1, 50, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_catalogue_take_max', 'catalogue.search.maxTake', 'catalogue', 'search', '50', 'number', 'Catalogue Max Page Size', 'Maximum result count for programme search', 1, 100, NULL, false, false, 1, NOW(), NOW(), 'system'),
('cfg_catalogue_compare_max', 'catalogue.compareMax', 'catalogue', 'compare', '3', 'number', 'Catalogue Compare Maximum', 'Maximum offerings compared at once (Part 2 section 5)', 1, 3, NULL, false, true, 1, NOW(), NOW(), 'system'),
('cfg_catalogue_session_ttl', 'catalogue.sessionTtlMinutes', 'catalogue', 'session', '30', 'number', 'Guidance Session TTL (minutes)', 'Transient anonymous guidance-session lifetime', 5, 120, NULL, false, false, 1, NOW(), NOW(), 'system');
