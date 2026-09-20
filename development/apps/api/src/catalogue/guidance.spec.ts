import { describe, expect, it } from 'vitest';
import type {
  GuidanceEvaluation,
  RequirementFact,
  RequirementRule,
} from '@sis/contracts';
import {
  canStartApplication,
  evaluateGuidance,
  limitComparison,
  selectLatestRules,
} from './guidance.js';

const GRADE_RULE: RequirementRule = {
  id: 'math',
  label: 'Mathematics',
  kind: 'GRADE',
  mandatory: true,
  minGrade: 6,
  requiresVerification: false,
  evidence: 'Grade 12 result statement',
  routeCode: 'ECZ',
};

const VERIFY_RULE: RequirementRule = {
  id: 'ecz',
  label: 'Verified result statement',
  kind: 'BOOLEAN',
  mandatory: true,
  minGrade: null,
  requiresVerification: true,
  evidence: 'ECZ result statement',
  routeCode: null,
};

const OPTIONAL_RULE: RequirementRule = {
  id: 'portfolio',
  label: 'Portfolio',
  kind: 'BOOLEAN',
  mandatory: false,
  minGrade: null,
  requiresVerification: false,
  evidence: 'Portfolio upload',
  routeCode: null,
};

function facts(
  overrides: Record<string, RequirementFact>,
): Record<string, RequirementFact> {
  return overrides;
}

describe('evaluateGuidance', () => {
  it('marks a met mandatory grade as APPEARS_MET', () => {
    const result: GuidanceEvaluation = evaluateGuidance(
      [GRADE_RULE],
      facts({ math: { value: 4 } }),
    );
    expect(result.results).toHaveLength(1);
    expect(result.results[0].verdict).toBe('APPEARS_MET');
    expect(result.results[0].blocking).toBe(false);
    expect(result.overall).toBe('APPEARS_MET');
  });

  it('marks a below-threshold mandatory grade as blocking NOT_MET', () => {
    const result = evaluateGuidance(
      [GRADE_RULE],
      facts({ math: { value: 7 } }),
    );
    expect(result.results[0].verdict).toBe('NOT_MET');
    expect(result.results[0].blocking).toBe(true);
    expect(result.overall).toBe('NOT_MET');
  });

  it('marks a missing fact as blocking INFO_MISSING', () => {
    const result = evaluateGuidance([GRADE_RULE], facts({}));
    expect(result.results[0].verdict).toBe('INFO_MISSING');
    expect(result.results[0].blocking).toBe(true);
    expect(result.overall).toBe('INFO_MISSING');
  });

  it('treats "I do not know yet" as INFO_MISSING, never a decision', () => {
    const result = evaluateGuidance(
      [GRADE_RULE],
      facts({ math: { unknown: true } }),
    );
    expect(result.results[0].verdict).toBe('INFO_MISSING');
    expect(result.overall).toBe('INFO_MISSING');
  });

  it('marks verification-gated rules as NEEDS_VERIFICATION, not met', () => {
    const result = evaluateGuidance(
      [VERIFY_RULE],
      facts({ ecz: { value: true } }),
    );
    expect(result.results[0].verdict).toBe('NEEDS_VERIFICATION');
    expect(result.results[0].blocking).toBe(false);
  });

  it('never lets an optional unmet rule block the overall outcome', () => {
    const result = evaluateGuidance(
      [GRADE_RULE, OPTIONAL_RULE],
      facts({ math: { value: 4 }, portfolio: { value: false } }),
    );
    const portfolio = result.results.find((r) => r.ruleId === 'portfolio');
    expect(portfolio?.verdict).toBe('NOT_MET');
    expect(portfolio?.blocking).toBe(false);
    expect(result.overall).toBe('APPEARS_MET');
  });

  it('marks grade rules with no configured threshold as UNAVAILABLE', () => {
    const unconfigured: RequirementRule = { ...GRADE_RULE, minGrade: null };
    const result = evaluateGuidance(
      [unconfigured],
      facts({ math: { value: 4 } }),
    );
    expect(result.results[0].verdict).toBe('UNAVAILABLE');
    expect(result.results[0].blocking).toBe(false);
  });

  it('surfaces NEEDS_VERIFICATION overall when mandatory evidence is unverified', () => {
    const result = evaluateGuidance(
      [GRADE_RULE, VERIFY_RULE],
      facts({ math: { value: 4 }, ecz: { value: true } }),
    );
    expect(result.overall).toBe('NEEDS_VERIFICATION');
  });

  it('surfaces UNAVAILABLE overall when a mandatory rule cannot be evaluated', () => {
    const unconfigured: RequirementRule = { ...GRADE_RULE, minGrade: null };
    const result = evaluateGuidance(
      [unconfigured],
      facts({ math: { value: 4 } }),
    );
    expect(result.overall).toBe('UNAVAILABLE');
  });

  it('returns UNAVAILABLE overall when no rules apply, never a false pass', () => {
    const result = evaluateGuidance([], facts({}));
    expect(result.results).toHaveLength(0);
    expect(result.overall).toBe('UNAVAILABLE');
  });

  it('treats out-of-range or non-integer grades as missing information', () => {
    for (const value of [999, -5, 3.5, 'four']) {
      const result = evaluateGuidance(
        [GRADE_RULE],
        facts({ math: { value: value as number } }),
      );
      expect(result.results[0].verdict).toBe('INFO_MISSING');
      expect(result.results[0].blocking).toBe(true);
    }
  });

  it('treats non-boolean answers as missing information, never a denial', () => {
    for (const value of ['yes', 1, 0]) {
      const result = evaluateGuidance(
        [VERIFY_RULE],
        facts({ ecz: { value: value as unknown as boolean } }),
      );
      expect(result.results[0].verdict).toBe('INFO_MISSING');
      expect(result.results[0].blocking).toBe(true);
    }
  });
});

describe('selectLatestRules', () => {
  it('keeps the highest version per rule key', () => {
    const kept = selectLatestRules([
      { ruleKey: 'math', version: 1, minGrade: 7 },
      { ruleKey: 'math', version: 2, minGrade: 6 },
      { ruleKey: 'ecz', version: 1, minGrade: null },
    ]);
    expect(kept).toHaveLength(2);
    expect(kept.find((r) => r.ruleKey === 'math')?.minGrade).toBe(6);
  });
});

describe('canStartApplication', () => {
  it('allows start only for OPEN offerings', () => {
    expect(canStartApplication('OPEN')).toBe(true);
    expect(canStartApplication('SOON')).toBe(false);
    expect(canStartApplication('CLOSED')).toBe(false);
    expect(canStartApplication('RETIRED')).toBe(false);
  });
});

describe('limitComparison', () => {
  it('keeps at most three offerings and flags truncation', () => {
    expect(limitComparison(['a', 'b', 'c', 'd']).truncated).toBe(true);
    expect(limitComparison(['a', 'b', 'c', 'd']).items).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(limitComparison(['a']).truncated).toBe(false);
  });
});
