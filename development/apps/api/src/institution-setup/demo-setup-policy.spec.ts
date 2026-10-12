import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  parseSetupCommand,
  parseActivationCommand,
  demoSetupEnabled,
  profileDigest,
} from './demo-setup-policy.js';

// Catches accepting invalid graph/calendar input, noncanonical replay and live activation.
const valid = () => ({
  clientRequestId: 'a02cdeab-7b11-4fc1-8d3f-24d660db4132',
  expectedVersion: 0,
  expectedActivationId: null,
  reason: 'Configure a fictional university',
  profile: {
    name: 'Fictional university',
    rootUnitCode: 'DEMO-UNI',
    unitTypes: [
      { code: 'UNIVERSITY', label: 'University', kind: 'INSTITUTION' },
      { code: 'COLLEGE', label: 'College', kind: 'ACADEMIC' },
    ],
    units: [
      {
        code: 'DEMO-UNI',
        name: 'Fictional university',
        typeCode: 'UNIVERSITY',
      },
      { code: 'DEMO-COLLEGE', name: 'Fictional college', typeCode: 'COLLEGE' },
    ],
    relationships: [
      { fromCode: 'DEMO-COLLEGE', toCode: 'DEMO-UNI', type: 'REPORTS_TO' },
    ],
    periodTypes: [
      { code: 'YEAR', label: 'Academic year' },
      { code: 'BLOCK', label: 'Teaching block' },
    ],
    periods: [
      {
        code: 'DEMO-YEAR',
        name: 'Academic year',
        typeCode: 'YEAR',
        parentCode: null,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      {
        code: 'DEMO-BLOCK',
        name: 'Teaching block',
        typeCode: 'BLOCK',
        parentCode: 'DEMO-YEAR',
        startDate: '2026-10-05',
        endDate: '2026-12-18',
      },
    ],
  },
});

function issueFrom(input: unknown) {
  try {
    parseSetupCommand(input);
    throw new Error('Expected setup validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse();
  }
}

describe('setup correction locations use original input rows', () => {
  it.each([
    [
      'profile text',
      (x: ReturnType<typeof valid>) => {
        x.profile.name = '';
      },
      { collection: 'profile', field: 'name' },
    ],
    [
      'root reference',
      (x: ReturnType<typeof valid>) => {
        x.profile.rootUnitCode = 'DEMO-MISSING';
      },
      { collection: 'profile', field: 'rootUnitCode' },
    ],
    [
      'unit label',
      (x: ReturnType<typeof valid>) => {
        x.profile.units[1].name = '';
      },
      { collection: 'units', index: 1, field: 'name' },
    ],
    [
      'unit-type label',
      (x: ReturnType<typeof valid>) => {
        x.profile.unitTypes[1].label = '';
      },
      { collection: 'unitTypes', index: 1, field: 'label' },
    ],
    [
      'period-type label',
      (x: ReturnType<typeof valid>) => {
        x.profile.periodTypes[1].label = '';
      },
      { collection: 'periodTypes', index: 1, field: 'label' },
    ],
    [
      'unit duplicate',
      (x: ReturnType<typeof valid>) => {
        x.profile.units.push({ ...x.profile.units[0] });
      },
      { collection: 'units', index: 2, field: 'code' },
    ],
    [
      'unit-type duplicate',
      (x: ReturnType<typeof valid>) => {
        x.profile.unitTypes.push({ ...x.profile.unitTypes[0] });
      },
      { collection: 'unitTypes', index: 2, field: 'code' },
    ],
    [
      'period-type duplicate',
      (x: ReturnType<typeof valid>) => {
        x.profile.periodTypes.push({ ...x.profile.periodTypes[0] });
      },
      { collection: 'periodTypes', index: 2, field: 'code' },
    ],
    [
      'period duplicate',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods.push({ ...x.profile.periods[0] });
      },
      { collection: 'periods', index: 2, field: 'code' },
    ],
    [
      'relationship duplicate',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships.push({ ...x.profile.relationships[0] });
      },
      { collection: 'relationships', index: 1, field: 'fromCode' },
    ],
    [
      'relationship source',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].fromCode = 'DEMO-MISSING';
      },
      { collection: 'relationships', index: 0, field: 'fromCode' },
    ],
    [
      'relationship target',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].toCode = 'DEMO-MISSING';
      },
      { collection: 'relationships', index: 0, field: 'toCode' },
    ],
    [
      'self relationship',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].toCode = 'DEMO-COLLEGE';
      },
      { collection: 'relationships', index: 0, field: 'toCode' },
    ],
    [
      'relationship type',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].type = 'INVALID';
      },
      { collection: 'relationships', index: 0, field: 'type' },
    ],
    [
      'location category',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].type = 'LOCATED_AT';
      },
      { collection: 'relationships', index: 0, field: 'toCode' },
    ],
    [
      'period type reference',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].typeCode = 'MISSING';
      },
      { collection: 'periods', index: 1, field: 'typeCode' },
    ],
    [
      'invalid date',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].startDate = '2026-02-29';
      },
      { collection: 'periods', index: 1, field: 'startDate' },
    ],
    [
      'reversed dates',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].endDate = '2026-01-01';
      },
      { collection: 'periods', index: 1, field: 'endDate' },
    ],
    [
      'parent reference',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].parentCode = 'DEMO-MISSING';
      },
      { collection: 'periods', index: 1, field: 'parentCode' },
    ],
    [
      'self parent',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].parentCode = 'DEMO-BLOCK';
      },
      { collection: 'periods', index: 1, field: 'parentCode' },
    ],
    [
      'start containment',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].startDate = '2025-12-31';
      },
      { collection: 'periods', index: 1, field: 'startDate' },
    ],
    [
      'missing collection',
      (x: ReturnType<typeof valid>) => {
        x.profile.units = [];
      },
      { collection: 'units', field: 'code' },
    ],
    [
      'malformed row',
      (x: ReturnType<typeof valid>) => {
        x.profile.units[1] = 'unsupported' as never;
      },
      { collection: 'units', index: 1, field: 'code' },
    ],
  ])('links %s to a static correction field', (_label, mutate, issue) => {
    const input = valid();
    mutate(input);
    expect(issueFrom(input)).toMatchObject({ issue });
  });

  it.each(['REPORTS_TO', 'ACADEMICALLY_OWNED_BY'])(
    'links a %s cycle to its original closing edge',
    (type) => {
      const input = valid();
      input.profile.relationships[0].type = type;
      input.profile.relationships.push({
        fromCode: 'DEMO-UNI',
        toCode: 'DEMO-COLLEGE',
        type,
      });
      expect(issueFrom(input)).toMatchObject({
        issue: { collection: 'relationships', index: 1, field: 'toCode' },
      });
    },
  );

  it('links a calendar cycle to the original parent field after period sorting', () => {
    const input = valid();
    input.profile.periods[0].parentCode = 'DEMO-BLOCK' as never;
    input.profile.periods[0].startDate = input.profile.periods[1].startDate;
    input.profile.periods[0].endDate = input.profile.periods[1].endDate;
    expect(issueFrom(input)).toMatchObject({
      issue: { collection: 'periods', index: 0, field: 'parentCode' },
    });
  });

  it.each([
    'clientRequestId',
    'contentDigest',
    'expectedActivationId',
    'confirmFictionalActivation',
    'password',
  ])('links activation %s safely', (field) => {
    const input = {
      clientRequestId: valid().clientRequestId,
      contentDigest: 'a'.repeat(64),
      expectedActivationId: null,
      confirmFictionalActivation: true,
      password: 'fixture-only',
    };
    Object.assign(input, {
      [field]: field === 'confirmFictionalActivation' ? false : '',
    });
    try {
      parseActivationCommand(input);
      throw new Error('Expected activation validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse();
      expect(body).toMatchObject({ issue: { collection: 'command', field } });
      expect(JSON.stringify(body)).not.toContain('fixture-only');
    }
  });

  it('identifies unit row 11 for a nonempty invalid code without returning input values', () => {
    const input = valid();
    for (let index = 2; index < 12; index++)
      input.profile.units.push({
        code: `DEMO-UNIT-${index}`,
        name: `Fictional unit ${index}`,
        typeCode: 'COLLEGE',
      });
    input.profile.units[11].code = 'invalid-but-not-empty';
    const body = issueFrom(input);
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Check unit code; use a DEMO- code.',
      issue: { collection: 'units', index: 11, field: 'code' },
    });
    expect(JSON.stringify(body)).not.toContain('invalid-but-not-empty');
    expect(input.profile.units[11].code).toBe('invalid-but-not-empty');
  });

  it('keeps a renamed type-reference correction on its original unit after type sorting', () => {
    const input = valid();
    input.profile.unitTypes[1].code = 'FACULTY';
    expect(issueFrom(input)).toMatchObject({
      issue: { collection: 'units', index: 1, field: 'typeCode' },
    });
  });

  it('identifies an invalid category on its original unsorted unit-type row', () => {
    const input = valid();
    input.profile.unitTypes[1].kind = 'INVALID' as never;
    expect(issueFrom(input)).toMatchObject({
      issue: { collection: 'unitTypes', index: 1, field: 'kind' },
    });
  });

  it('identifies calendar containment on the original child row after canonical sorting', () => {
    const input = valid();
    input.profile.periods[1].endDate = '2027-01-01';
    expect(issueFrom(input)).toMatchObject({
      message: 'Keep DEMO-BLOCK within its parent period dates.',
      issue: { collection: 'periods', index: 1, field: 'endDate' },
    });
    expect(input.profile.periods[0].code).toBe('DEMO-YEAR');
  });

  it('links a missing change reason to the command field', () => {
    const input = valid();
    input.reason = '';
    expect(issueFrom(input)).toMatchObject({
      issue: { collection: 'command', field: 'reason' },
    });
  });

  it('keeps credential values and unknown property names out of correction metadata', () => {
    const marker = 'fixture-value-never-returned';
    try {
      parseActivationCommand({ clientRequestId: marker, password: marker });
      throw new Error('Expected activation validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse();
      expect(body).toMatchObject({
        issue: { collection: 'command', field: 'clientRequestId' },
      });
      expect(JSON.stringify(body)).not.toContain(marker);
    }
    const input = valid();
    Object.assign(input.profile.units[1], { [marker]: { password: marker } });
    const body = issueFrom(input);
    expect(body).toMatchObject({
      issue: { collection: 'units', index: 1, field: 'code' },
    });
    expect(JSON.stringify(body)).not.toContain(marker);
  });
});

describe('fictional university setup policy', () => {
  it('accepts a college and block model without requiring school or semester', () => {
    expect(parseSetupCommand(valid()).profile.units).toHaveLength(2);
  });
  it('canonicalises unordered sets to the same content digest', () => {
    const a = valid();
    const b = valid();
    b.profile.units.reverse();
    b.profile.periods.reverse();
    b.profile.unitTypes.reverse();
    expect(profileDigest(parseSetupCommand(a))).toBe(
      profileDigest(parseSetupCommand(b)),
    );
    b.reason = 'A different decision';
    expect(profileDigest(parseSetupCommand(a))).not.toBe(
      profileDigest(parseSetupCommand(b)),
    );
  });
  it.each([
    [
      'unknown input',
      (x: ReturnType<typeof valid>) => Object.assign(x, { execute: 'code' }),
    ],
    [
      'non-demo identity',
      (x: ReturnType<typeof valid>) => {
        x.profile.units[1].code = 'REAL-UNIT';
      },
    ],
    [
      'duplicate code',
      (x: ReturnType<typeof valid>) => {
        x.profile.units.push(x.profile.units[0]);
      },
    ],
    [
      'missing relationship target',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].toCode = 'DEMO-MISSING';
      },
    ],
    [
      'self relationship',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships[0].toCode = 'DEMO-COLLEGE';
      },
    ],
    [
      'reporting cycle',
      (x: ReturnType<typeof valid>) => {
        x.profile.relationships.push({
          fromCode: 'DEMO-UNI',
          toCode: 'DEMO-COLLEGE',
          type: 'REPORTS_TO',
        });
      },
    ],
    [
      'invalid leap date',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].startDate = '2026-02-29';
      },
    ],
    [
      'outside parent',
      (x: ReturnType<typeof valid>) => {
        x.profile.periods[1].endDate = '2027-01-01';
      },
    ],
    [
      'unknown type',
      (x: ReturnType<typeof valid>) => {
        x.profile.units[1].typeCode = 'EXECUTABLE';
      },
    ],
    [
      'overlong reason',
      (x: ReturnType<typeof valid>) => {
        x.reason = 'x'.repeat(501);
      },
    ],
  ])('rejects %s with an actionable validation error', (_label, mutate) => {
    const input = valid();
    mutate(input);
    expect(() => parseSetupCommand(input)).toThrow(BadRequestException);
  });
  it('allows overlapping teaching/examination periods when contained', () => {
    const input = valid();
    input.profile.periods.push({
      ...input.profile.periods[1],
      code: 'DEMO-EXAM',
      name: 'Examination block',
    });
    expect(parseSetupCommand(input).profile.periods).toHaveLength(3);
  });
  it('denies remotely hosted or non-review databases even with flags', () => {
    const flags = {
      DEMO_MODE: 'true',
      SIS_ENABLE_INSTITUTION_DEMO_SETUP: 'true',
    };
    expect(
      demoSetupEnabled({
        ...flags,
        DATABASE_URL: 'postgresql://localhost/sis_review',
      }),
    ).toBe(true);
    for (const DATABASE_URL of [
      'postgresql://remote.example/sis_review',
      'postgresql://localhost/production',
      'bad',
    ])
      expect(demoSetupEnabled({ ...flags, DATABASE_URL })).toBe(false);
    expect(
      demoSetupEnabled({ DATABASE_URL: 'postgresql://localhost/sis_review' }),
    ).toBe(false);
  });
});
