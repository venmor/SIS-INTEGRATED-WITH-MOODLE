/**
 * Configuration System Types & Schemas
 * Single source of truth for ALL configurable values.
 * All values are database-backed and UI-configurable.
 */

import { z } from 'zod';

/**
 * Configuration Item value types
 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'array' | 'object';

/**
 * Configuration Item schema (matches Prisma model)
 */
export const ConfigurationItemSchema = z.object({
  id: z.string().cuid(),
  key: z.string().min(1),
  category: z.string().min(1),
  subCategory: z.string().optional(),
  value: z.unknown(),
  valueType: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  label: z.string().min(1),
  description: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  allowedValues: z.unknown().optional(),
  isSecret: z.boolean().default(false),
  isReadOnly: z.boolean().default(false),
  version: z.number().int().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  updatedBy: z.string().optional(),
});

export type ConfigurationItem = z.infer<typeof ConfigurationItemSchema>;

/**
 * Configuration Version schema
 */
export const ConfigurationVersionSchema = z.object({
  id: z.string().cuid(),
  snapshot: z.unknown(),
  changedBy: z.string(),
  changeReason: z.string(),
  createdAt: z.date(),
});

export type ConfigurationVersion = z.infer<typeof ConfigurationVersionSchema>;

/**
 * Configuration value coercion
 * Converts stored JSON value to the appropriate TypeScript type based on valueType
 */
export function coerceConfigValue(value: unknown, valueType: string): unknown {
  switch (valueType) {
    case 'string':
      return String(value);
    case 'number':
      return Number(value);
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value === 'true';
      return Boolean(value);
    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return [value];
        }
      }
      return Array.isArray(value) ? value : [value];
    case 'object':
      if (typeof value === 'object' && value !== null) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return {};
    default:
      return value;
  }
}

/**
 * Validate a configuration value against its schema
 */
export function validateConfigValue(
  value: unknown,
  valueType: string,
  constraints?: {
    minValue?: number;
    maxValue?: number;
    allowedValues?: unknown[];
  }
): { valid: boolean; error?: string; coercedValue?: unknown } {
  const coerced = coerceConfigValue(value, valueType);

  switch (valueType) {
    case 'number': {
      const num = Number(coerced);
      if (isNaN(num)) return { valid: false, error: 'Value is not a valid number' };
      return { valid: true, coercedValue: num };
    }
    case 'string':
      return { valid: true, coercedValue: String(coerced) };
    case 'boolean':
      return { valid: true, coercedValue: Boolean(coerced) };
    case 'array': {
      if (!Array.isArray(coerced)) return { valid: false, error: 'Value must be an array' };
      return { valid: true, coercedValue: coerced };
    }
    case 'object': {
      if (typeof coerced !== 'object' || coerced === null || Array.isArray(coerced)) {
        return { valid: false, error: 'Value must be an object' };
      }
      return { valid: true, coercedValue: coerced };
    }
    default:
      return { valid: true, coercedValue: coerced };
  }
}

/**
 * Type guard for ConfigurationItem
 */
export function isConfigurationItem(obj: unknown): obj is { key: string; category: string; value: unknown; valueType: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'key' in obj &&
    'category' in obj &&
    'value' in obj &&
    'valueType' in obj
  );
}

/**
 * Coerce config value to specific type with default
 */
export function getConfigValue<T>(
  value: unknown,
  valueType: string,
  defaultValue: T
): T {
  try {
    const coerced = coerceConfigValue(value, 'object');
    return (coerced as T) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Config key constants - single source of truth for all config keys
 * Organized by category for easy discovery
 * Using unique keys to avoid duplicate property names in object literals
 */
export const ConfigKeys = {
  security: {
    session: {
      absoluteSeconds: 'security.session.absoluteSeconds',
      idleSeconds: 'security.session.idleSeconds',
      cookieName: 'security.session.cookieName',
    },
    rateLimit: {
      signIn: {
        signInMaxAttempts: 'security.rateLimit.signIn.maxAttempts',
        signInWindowMinutes: 'security.rateLimit.signIn.windowMinutes',
      },
      recovery: {
        recoveryMaxAttempts: 'security.rateLimit.recovery.maxAttempts',
        recoveryWindowMinutes: 'security.rateLimit.recovery.windowMinutes',
      },
      grant: {
        grantMaxAttempts: 'security.rateLimit.grant.maxAttempts',
        grantWindowMinutes: 'security.rateLimit.grant.windowMinutes',
      },
      workspaceSwitch: {
        workspaceSwitchMaxAttempts: 'security.rateLimit.workspaceSwitch.maxAttempts',
        workspaceSwitchWindowMinutes: 'security.rateLimit.workspaceSwitch.windowMinutes',
      },
      grantResolve: {
        grantResolveMaxAttempts: 'security.rateLimit.grantResolve.maxAttempts',
        grantResolveWindowMinutes: 'security.rateLimit.grantResolve.windowMinutes',
      },
      read: {
        readMaxAttempts: 'security.rateLimit.read.maxAttempts',
        readWindowMinutes: 'security.rateLimit.read.windowMinutes',
      },
    },
    lockout: {
      failuresBeforeLock: 'security.lockout.failuresBeforeLock',
      lockMinutes: 'security.lockout.lockMinutes',
    },
    grantorRoles: 'security.grantorRoles',
    policyVerbs: 'security.policyVerbs',
    sodPairs: 'security.sodPairs',
    passwordPolicy: {
      minLength: 'security.passwordPolicy.minLength',
      guidance: 'security.passwordPolicy.guidance',
    },
    recoveryTokenMinutes: 'security.recoveryTokenMinutes',
    // Slice-5 specific
    expiryCheckIntervalMinutes: 'security.expiryCheckIntervalMinutes',
    breakGlassMaxMinutes: 'security.breakGlassMaxMinutes',
    reviewCadence: {
      high: 'security.reviewCadence.high',
      medium: 'security.reviewCadence.medium',
      low: 'security.reviewCadence.low',
    },
    reviewRoles: 'security.reviewRoles',
    expiryWarningThresholdMinutes: 'security.expiryWarningThresholdMinutes',
    expiryWarningTtlMinutes: 'security.expiryWarningTtlMinutes',
    breakGlassApproverRoles: 'security.breakGlass.approverRoles',
    // Audit
    auditRetentionDays: 'security.auditRetentionDays',
    auditExportFormats: 'security.auditExportFormats',
  },
} as const;

/**
 * Type-safe config key getter
 */
export type ConfigKey = typeof ConfigKeys[keyof typeof ConfigKeys];

/**
 * Helper to get all config keys as flat array
 */
export function getAllConfigKeys(): string[] {
  const keys: string[] = [];
  const extractKeys = (obj: Record<string, unknown>): void => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        keys.push(value);
      } else if (typeof value === 'object' && value !== null) {
        extractKeys(value as Record<string, unknown>);
      }
    };
  };
  extractKeys(ConfigKeys);
  return keys;
}