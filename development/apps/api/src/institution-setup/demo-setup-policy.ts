import { isDemonstrationDatabaseTarget } from '@sis/config';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  DemoUniversityProfile,
  SaveDemoUniversityCommand,
  ActivateDemoUniversityCommand,
  DemoUnitKind,
  DemoUnitRelationship,
  DemoSetupValidationIssue,
} from '@sis/contracts';

export const DEMO_SETUP_POLICY = 'DEMO-SETUP-2026.1';
export const SETUP_SCOPE = 'DEMO-UNIVERSITY';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const demoCode = /^DEMO-[A-Z0-9-]{1,40}$/;
const typeCode = /^[A-Z][A-Z0-9_-]{0,39}$/;
function fail(message: string, issue?: DemoSetupValidationIssue): never {
  throw new BadRequestException(
    issue ? { statusCode: 400, message, error: 'Bad Request', issue } : message,
  );
}
function object(
  raw: unknown,
  keys: string[],
  label: string,
  issue?: DemoSetupValidationIssue,
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return fail(`Check ${label}.`, issue);
  if (Object.keys(raw).some((key) => !keys.includes(key)))
    return fail(`Unsupported field in ${label}.`, issue);
  return raw as Record<string, unknown>;
}
function hasControlCharacters(raw: string): boolean {
  for (let index = 0; index < raw.length; index++)
    if (raw.charCodeAt(index) < 32) return true;
  return false;
}
function text(
  raw: unknown,
  label: string,
  max = 120,
  issue?: DemoSetupValidationIssue,
): string {
  if (
    typeof raw !== 'string' ||
    !raw.trim() ||
    raw.trim().length > max ||
    hasControlCharacters(raw)
  )
    return fail(`Enter ${label} (1–${max} characters).`, issue);
  return raw.trim();
}
function code(
  raw: unknown,
  label: string,
  pattern = demoCode,
  issue?: DemoSetupValidationIssue,
): string {
  const value = text(raw, label, 45, issue);
  if (!pattern.test(value))
    return fail(
      `Check ${label}; use ${pattern === demoCode ? 'a DEMO- code' : 'an uppercase type code'}.`,
      issue,
    );
  return value;
}
function list(
  raw: unknown,
  label: string,
  max: number,
  min = 1,
  issue?: DemoSetupValidationIssue,
): unknown[] {
  if (!Array.isArray(raw) || raw.length < min || raw.length > max)
    return fail(`Enter ${min}–${max} ${label}.`, issue);
  return raw;
}
function unique<T>(
  rows: T[],
  key: (row: T) => string,
  label: string,
  collection: DemoSetupValidationIssue['collection'],
  field = 'code',
): T[] {
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const value = key(row);
    if (seen.has(value))
      fail(`${label} is repeated: ${value}.`, { collection, index, field });
    seen.add(value);
  }
  return rows.sort((a, b) => key(a).localeCompare(key(b), 'en'));
}
function date(
  raw: unknown,
  label: string,
  issue?: DemoSetupValidationIssue,
): string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw))
    return fail(`Enter ${label} as a valid date.`, issue);
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== raw
  )
    return fail(`Enter ${label} as a valid date.`, issue);
  return raw;
}
function acyclic(
  edges: { from: string; to: string; issue: DemoSetupValidationIssue }[],
  label: string,
) {
  const next = new Map<
    string,
    { to: string; issue: DemoSetupValidationIssue }[]
  >();
  for (const edge of edges)
    next.set(edge.from, [...(next.get(edge.from) ?? []), edge]);
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (node: string, issue?: DemoSetupValidationIssue) => {
    if (visiting.has(node)) fail(`${label} has a cycle at ${node}.`, issue);
    if (done.has(node)) return;
    visiting.add(node);
    for (const child of next.get(node) ?? []) visit(child.to, child.issue);
    visiting.delete(node);
    done.add(node);
  };
  for (const node of next.keys()) visit(node);
}
function activationId(raw: unknown): string | null {
  if (raw === null) return null;
  if (typeof raw !== 'string' || !uuid.test(raw))
    return fail('Reload the current activation reference.', {
      collection: 'command',
      field: 'expectedActivationId',
    });
  return raw;
}
export function parseSetupCommand(raw: unknown): SaveDemoUniversityCommand {
  // Canonical sorting never changes correction targets in the submitted draft.
  const originalIndexes = new WeakMap<object, number>();
  const indexed = <T extends object>(row: T, index: number): T => {
    originalIndexes.set(row, index);
    return row;
  };
  const at = (
    collection: DemoSetupValidationIssue['collection'],
    field: string,
    index?: number,
  ): DemoSetupValidationIssue => ({
    collection,
    field,
    ...(index === undefined ? {} : { index }),
  });
  const value = object(
    raw,
    [
      'clientRequestId',
      'expectedVersion',
      'expectedActivationId',
      'reason',
      'profile',
    ],
    'setup draft',
    at('command', 'clientRequestId'),
  );
  if (
    typeof value.clientRequestId !== 'string' ||
    !uuid.test(value.clientRequestId)
  )
    fail(
      'A valid command reference is required.',
      at('command', 'clientRequestId'),
    );
  if (
    !Number.isSafeInteger(value.expectedVersion) ||
    (value.expectedVersion as number) < 0
  )
    fail('Reload the latest draft version.', at('command', 'expectedVersion'));
  const p = object(
    value.profile,
    [
      'name',
      'rootUnitCode',
      'unitTypes',
      'units',
      'relationships',
      'periodTypes',
      'periods',
    ],
    'university profile',
    at('profile', 'name'),
  );
  const kinds: DemoUnitKind[] = [
    'INSTITUTION',
    'CAMPUS',
    'ACADEMIC',
    'ADMINISTRATIVE',
  ];
  const unitTypes = unique(
    list(p.unitTypes, 'unit types', 30, 1, at('unitTypes', 'code')).map(
      (raw, index) => {
        const r = object(
          raw,
          ['code', 'label', 'kind'],
          'unit type',
          at('unitTypes', 'code', index),
        );
        if (!kinds.includes(r.kind as DemoUnitKind))
          fail(
            'Select a supported unit category.',
            at('unitTypes', 'kind', index),
          );
        return {
          code: code(
            r.code,
            'unit type code',
            typeCode,
            at('unitTypes', 'code', index),
          ),
          label: text(
            r.label,
            'unit type label',
            120,
            at('unitTypes', 'label', index),
          ),
          kind: r.kind as DemoUnitKind,
        };
      },
    ),
    (r) => r.code,
    'Unit type',
    'unitTypes',
  );
  const units = unique(
    list(p.units, 'units', 200, 1, at('units', 'code')).map((raw, index) => {
      const r = object(
        raw,
        ['code', 'name', 'typeCode'],
        'unit',
        at('units', 'code', index),
      );
      const type = code(
        r.typeCode,
        'unit type',
        typeCode,
        at('units', 'typeCode', index),
      );
      if (!unitTypes.some((t) => t.code === type))
        fail(
          'Select a configured type for every unit.',
          at('units', 'typeCode', index),
        );
      return {
        code: code(r.code, 'unit code', demoCode, at('units', 'code', index)),
        name: text(r.name, 'unit name', 120, at('units', 'name', index)),
        typeCode: type,
      };
    }),
    (r) => r.code,
    'Unit code',
    'units',
  );
  const rootUnitCode = code(
    p.rootUnitCode,
    'root institution code',
    demoCode,
    at('profile', 'rootUnitCode'),
  );
  const root = units.find((u) => u.code === rootUnitCode);
  if (
    !root ||
    unitTypes.find((t) => t.code === root.typeCode)?.kind !== 'INSTITUTION'
  )
    fail(
      'Select an institution-category root unit.',
      at('profile', 'rootUnitCode'),
    );
  const relationTypes: DemoUnitRelationship[] = [
    'REPORTS_TO',
    'ACADEMICALLY_OWNED_BY',
    'DELIVERED_BY',
    'LOCATED_AT',
  ];
  const relationships = unique(
    list(
      p.relationships,
      'relationships',
      400,
      0,
      at('relationships', 'fromCode'),
    ).map((raw, index) => {
      const r = object(
        raw,
        ['fromCode', 'toCode', 'type'],
        'relationship',
        at('relationships', 'fromCode', index),
      );
      const fromCode = code(
        r.fromCode,
        'relationship source',
        demoCode,
        at('relationships', 'fromCode', index),
      );
      const toCode = code(
        r.toCode,
        'relationship target',
        demoCode,
        at('relationships', 'toCode', index),
      );
      if (
        fromCode === toCode ||
        !units.some((u) => u.code === fromCode) ||
        !units.some((u) => u.code === toCode)
      )
        fail(
          'Choose two different configured units for every relationship.',
          at(
            'relationships',
            fromCode !== toCode && !units.some((u) => u.code === fromCode)
              ? 'fromCode'
              : 'toCode',
            index,
          ),
        );
      if (!relationTypes.includes(r.type as DemoUnitRelationship))
        fail(
          'Select a supported relationship type.',
          at('relationships', 'type', index),
        );
      if (
        r.type === 'LOCATED_AT' &&
        unitTypes.find(
          (t) => t.code === units.find((u) => u.code === toCode)!.typeCode,
        )?.kind !== 'CAMPUS'
      )
        fail(
          'A location relationship must point to a campus-category unit.',
          at('relationships', 'toCode', index),
        );
      return indexed(
        { fromCode, toCode, type: r.type as DemoUnitRelationship },
        index,
      );
    }),
    (r) => `${r.type}:${r.fromCode}:${r.toCode}`,
    'Relationship',
    'relationships',
    'fromCode',
  );
  for (const type of ['REPORTS_TO', 'ACADEMICALLY_OWNED_BY'])
    acyclic(
      relationships
        .filter((r) => r.type === type)
        .map((r) => ({
          from: r.fromCode,
          to: r.toCode,
          issue: at('relationships', 'toCode', originalIndexes.get(r)),
        })),
      type === 'REPORTS_TO' ? 'Reporting graph' : 'Academic ownership graph',
    );
  const periodTypes = unique(
    list(p.periodTypes, 'period types', 30, 1, at('periodTypes', 'code')).map(
      (raw, index) => {
        const r = object(
          raw,
          ['code', 'label'],
          'period type',
          at('periodTypes', 'code', index),
        );
        return {
          code: code(
            r.code,
            'period type code',
            typeCode,
            at('periodTypes', 'code', index),
          ),
          label: text(
            r.label,
            'period type label',
            120,
            at('periodTypes', 'label', index),
          ),
        };
      },
    ),
    (r) => r.code,
    'Period type',
    'periodTypes',
  );
  const periods = unique(
    list(p.periods, 'academic periods', 100, 1, at('periods', 'code')).map(
      (raw, index) => {
        const r = object(
          raw,
          ['code', 'name', 'typeCode', 'parentCode', 'startDate', 'endDate'],
          'academic period',
          at('periods', 'code', index),
        );
        const type = code(
          r.typeCode,
          'period type',
          typeCode,
          at('periods', 'typeCode', index),
        );
        if (!periodTypes.some((t) => t.code === type))
          fail(
            'Select a configured type for every period.',
            at('periods', 'typeCode', index),
          );
        const startDate = date(
          r.startDate,
          'period start',
          at('periods', 'startDate', index),
        );
        const endDate = date(
          r.endDate,
          'period end',
          at('periods', 'endDate', index),
        );
        if (startDate > endDate)
          fail(
            'Period end must be on or after its start.',
            at('periods', 'endDate', index),
          );
        return indexed(
          {
            code: code(
              r.code,
              'period code',
              demoCode,
              at('periods', 'code', index),
            ),
            name: text(
              r.name,
              'period name',
              120,
              at('periods', 'name', index),
            ),
            typeCode: type,
            parentCode:
              r.parentCode === null
                ? null
                : code(
                    r.parentCode,
                    'parent period',
                    demoCode,
                    at('periods', 'parentCode', index),
                  ),
            startDate,
            endDate,
          },
          index,
        );
      },
    ),
    (r) => r.code,
    'Period code',
    'periods',
  );
  for (const r of periods)
    if (r.parentCode !== null) {
      const parent = periods.find((p) => p.code === r.parentCode);
      if (!parent || parent.code === r.code)
        fail(
          'Select a different configured parent period.',
          at('periods', 'parentCode', originalIndexes.get(r)),
        );
      if (r.startDate < parent.startDate || r.endDate > parent.endDate)
        fail(
          `Keep ${r.code} within its parent period dates.`,
          at(
            'periods',
            r.startDate < parent.startDate ? 'startDate' : 'endDate',
            originalIndexes.get(r),
          ),
        );
    }
  acyclic(
    periods
      .filter((p) => p.parentCode !== null)
      .map((p) => ({
        from: p.code,
        to: p.parentCode!,
        issue: at('periods', 'parentCode', originalIndexes.get(p)),
      })),
    'Calendar hierarchy',
  );
  const profile: DemoUniversityProfile = {
    name: text(p.name, 'university name', 120, at('profile', 'name')),
    rootUnitCode,
    unitTypes,
    units,
    relationships,
    periodTypes,
    periods,
  };
  return {
    clientRequestId: value.clientRequestId as string,
    expectedVersion: value.expectedVersion as number,
    expectedActivationId: activationId(value.expectedActivationId),
    reason: text(value.reason, 'change reason', 500, at('command', 'reason')),
    profile,
  };
}
export function parseActivationCommand(
  raw: unknown,
): ActivateDemoUniversityCommand {
  const r = object(
    raw,
    [
      'clientRequestId',
      'contentDigest',
      'expectedActivationId',
      'confirmFictionalActivation',
      'password',
    ],
    'activation command',
    { collection: 'command', field: 'clientRequestId' },
  );
  if (typeof r.clientRequestId !== 'string' || !uuid.test(r.clientRequestId))
    fail('A valid approval reference is required.', {
      collection: 'command',
      field: 'clientRequestId',
    });
  if (
    typeof r.contentDigest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(r.contentDigest)
  )
    fail('Reload the exact saved version before approval.', {
      collection: 'command',
      field: 'contentDigest',
    });
  if (r.confirmFictionalActivation !== true)
    fail('Confirm you reviewed this fictional setup version.', {
      collection: 'command',
      field: 'confirmFictionalActivation',
    });
  if (typeof r.password !== 'string' || !r.password || r.password.length > 256)
    fail('Re-enter your account password for this fictional approval.', {
      collection: 'command',
      field: 'password',
    });
  return {
    clientRequestId: r.clientRequestId as string,
    contentDigest: r.contentDigest as string,
    expectedActivationId: activationId(r.expectedActivationId),
    confirmFictionalActivation: true,
    password: r.password as string,
  };
}
export function profileDigest(command: SaveDemoUniversityCommand): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        profile: command.profile,
        reason: command.reason,
        baseActivationId: command.expectedActivationId,
        expectedVersion: command.expectedVersion,
        policy: DEMO_SETUP_POLICY,
      }),
    )
    .digest('hex');
}
export function demoSetupEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    env.DEMO_MODE !== 'true' ||
    env.SIS_ENABLE_INSTITUTION_DEMO_SETUP !== 'true'
  )
    return false;
  return isDemonstrationDatabaseTarget(env);
}
