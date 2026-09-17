import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { ConfigurationItem, Prisma } from '@prisma/client';
import { coerceConfigValue } from '@sis/config';

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private readonly prisma: PrismaService;
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly TTL_MS = 30_000; // 30-second cache TTL
  private allKeys: string[] = [];

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async onModuleInit(): Promise<void> {
    // Pre-load all config keys for validation
    this.allKeys = await this.getAllConfigKeys();
  }

  /**
   * Get a configuration value by key, with caching
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const item = await this.prisma.configurationItem.findUnique({
      where: { key },
    });

    if (!item) {
      return null;
    }

    const value = this.coerceValue(item.value, item.valueType);
    this.cache.set(key, { value, expiresAt: Date.now() + 30_000 });
    return value as T;
  }

  /**
   * Get a configuration value by key, throw if not found
   */
  async getOrThrow<T = unknown>(key: string): Promise<T> {
    const value = await this.get<T>(key);
    if (value === null) {
      throw new Error(`Configuration not found: ${key}`);
    }
    return value;
  }

  /**
   * Get multiple configuration values at once
   */
  async getMany<T = unknown>(
    keys: string[],
  ): Promise<Record<string, T | null>> {
    const items = await this.prisma.configurationItem.findMany({
      where: { key: { in: keys } },
    });

    const result: Record<string, T | null> = {};
    for (const key of keys) {
      const item = items.find((i) => i.key === key);
      if (item) {
        result[key] = this.coerceValue(item.value, item.valueType) as T;
      } else {
        result[key] = null;
      }
    }
    return result;
  }

  /**
   * Get all configuration items by category
   */
  async getByCategory(category: string) {
    const items = await this.prisma.configurationItem.findMany({
      where: { category },
      orderBy: { subCategory: 'asc' },
    });

    return items.map((item) => ({
      key: item.key,
      label: item.label,
      value: this.coerceValue(item.value, item.valueType),
      valueType: item.valueType,
      description: item.description ?? undefined,
      minValue: item.minValue ?? undefined,
      maxValue: item.maxValue ?? undefined,
      allowedValues: item.allowedValues ?? undefined,
      isSecret: item.isSecret,
      isReadOnly: item.isReadOnly,
    }));
  }

  /**
   * Get all configuration items grouped by category
   */
  async getAllGrouped() {
    const items = await this.prisma.configurationItem.findMany({
      orderBy: [{ category: 'asc' }, { subCategory: 'asc' }, { label: 'asc' }],
    });

    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    const result: Record<
      string,
      Array<{
        key: string;
        label: string;
        value: unknown;
        valueType: string;
        description: string | undefined;
        minValue: number | undefined;
        maxValue: number | undefined;
        allowedValues: Prisma.JsonValue | undefined;
        isSecret: boolean;
        isReadOnly: boolean;
      }>
    > = {};
    for (const [category, items] of Object.entries(grouped)) {
      result[category] = items.map((item) => ({
        key: item.key,
        label: item.label,
        value: this.coerceValue(item.value, item.valueType),
        valueType: item.valueType,
        description: item.description ?? undefined,
        minValue: item.minValue ?? undefined,
        maxValue: item.maxValue ?? undefined,
        allowedValues: item.allowedValues ?? undefined,
        isSecret: item.isSecret,
        isReadOnly: item.isReadOnly,
      }));
    }

    return result;
  }

  /**
   * Get all configuration keys for validation.
   * Public: the admin configuration controller lists keys for operators.
   */
  async getAllConfigKeys(): Promise<string[]> {
    const items = await this.prisma.configurationItem.findMany({
      select: { key: true },
    });
    return items.map((i) => i.key);
  }

  /**
   * Validate and update a configuration value
   * Returns the updated ConfigurationItem
   */
  async update(
    key: string,
    value: unknown,
    updatedBy: string,
    changeReason: string,
  ) {
    const existing = await this.prisma.configurationItem.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new Error(`Configuration not found: ${key}`);
    }

    if (existing.isReadOnly) {
      throw new Error(`Configuration is read-only: ${key}`);
    }

    // Validate the value
    const validation = this.validateValue(existing, value);
    if (!validation.valid) {
      throw new Error(`Invalid value for ${key}: ${validation.error}`);
    }

    const coercedValue = this.coerceForStorage(value, existing.valueType);

    // Create version snapshot before update
    const allItems = await this.prisma.configurationItem.findMany();
    const snapshot = allItems.reduce(
      (acc, item) => {
        acc[item.key] = item.value;
        return acc;
      },
      {} as Record<string, unknown>,
    );

    // Use transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // Update the configuration item
      const updated = await tx.configurationItem.update({
        where: { key },
        data: {
          value: coercedValue as Prisma.InputJsonValue,
          version: { increment: 1 },
          updatedAt: new Date(),
          updatedBy,
        },
      });

      // Create version snapshot
      const version = await tx.configurationVersion.create({
        data: {
          snapshot: snapshot as Prisma.InputJsonValue,
          changedBy: updatedBy,
          changeReason,
        },
      });

      // Invalidate cache
      this.cache.delete(key);

      return { item: updated, version };
    });
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Coerce stored JSON value to TypeScript type
   */
  private coerceValue(value: Prisma.JsonValue, valueType: string): unknown {
    return coerceConfigValue(value, valueType);
  }

  /**
   * Coerce input value for storage in database
   */
  private coerceForStorage(
    value: unknown,
    valueType: string,
  ): Prisma.JsonValue {
    switch (valueType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return (Array.isArray(value) ? value : [value]) as Prisma.JsonValue;
      case 'object':
        return value as Prisma.JsonObject;
      default:
        return String(value);
    }
  }

  private validateValue(
    item: ConfigurationItem,
    value: unknown,
  ): { valid: boolean; error?: string } {
    const valueType = item.valueType;
    try {
      switch (item.valueType) {
        case 'number': {
          const num = Number(value);
          if (isNaN(num))
            return { valid: false, error: 'Value must be a number' };
          if (item.minValue !== null && num < item.minValue) {
            return { valid: false, error: `Value must be >= ${item.minValue}` };
          }
          if (item.maxValue !== null && num > item.maxValue) {
            return { valid: false, error: `Value must be <= ${item.maxValue}` };
          }
          break;
        }
        case 'string':
          if (typeof value !== 'string')
            return { valid: false, error: 'Value must be a string' };
          if (item.allowedValues && Array.isArray(item.allowedValues)) {
            if (!item.allowedValues.includes(value)) {
              return { valid: false, error: 'Value not in allowed values' };
            }
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean')
            return { valid: false, error: 'Value must be a boolean' };
          break;
        case 'array':
          if (!Array.isArray(value))
            return { valid: false, error: 'Value must be an array' };
          if (item.allowedValues && Array.isArray(item.allowedValues)) {
            const allowed = item.allowedValues as string[];
            for (const val of value) {
              if (!allowed.includes(String(val))) {
                return {
                  valid: false,
                  error: `Array contains invalid value: ${val}`,
                };
              }
            }
          }
          break;
        case 'object':
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return { valid: false, error: 'Value must be an object' };
          }
          break;
        default:
          return {
            valid: false,
            error: `Unknown valueType: ${item.valueType}`,
          };
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  private sanitizeForJson(value: unknown): Prisma.JsonValue {
    if (value === undefined || value === null) return null;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') return value as unknown as Prisma.JsonObject;
    return String(value);
  }
}
