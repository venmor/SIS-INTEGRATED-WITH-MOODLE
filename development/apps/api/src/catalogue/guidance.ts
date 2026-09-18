import type {
  AvailabilityStatus,
  GuidanceEvaluation,
  GuidanceResult,
  GuidanceVerdict,
  RequirementFact,
  RequirementRule,
} from '@sis/contracts';
import { CATALOGUE_V1 } from '@sis/config';

// Pure eligibility-guidance evaluator (applicant journey Part 2 §6).
// Lower-is-better grade scale (1–9). Never promises admission: automated
// outcomes never decide; formal verification always stays human (§6.5).
// Malformed facts (out-of-range grades, non-boolean answers) yield
// INFO_MISSING — the evaluator reports missing information, never a denial
// or pass on attacker-shaped input.

function isGradeValue(value: string | number | boolean): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  );
}

function evaluateRule(
  rule: RequirementRule,
  fact: RequirementFact | undefined,
): GuidanceResult {
  const entered =
    fact?.value === undefined || fact.unknown === true ? null : fact.value;
  if (entered === null) {
    return {
      ruleId: rule.id,
      verdict: 'INFO_MISSING',
      blocking: rule.mandatory,
      entered,
    };
  }
  let verdict: GuidanceVerdict;
  if (rule.kind === 'GRADE') {
    if (rule.minGrade === null) {
      verdict = 'UNAVAILABLE';
    } else if (!isGradeValue(entered)) {
      verdict = 'INFO_MISSING';
    } else {
      verdict = entered <= rule.minGrade ? 'APPEARS_MET' : 'NOT_MET';
    }
  } else if (rule.kind === 'BOOLEAN') {
    if (typeof entered !== 'boolean') {
      verdict = 'INFO_MISSING';
    } else if (entered === true) {
      verdict = rule.requiresVerification
        ? 'NEEDS_VERIFICATION'
        : 'APPEARS_MET';
    } else {
      verdict = 'NOT_MET';
    }
  } else {
    // TEXT and future kinds: no automated comparison without an approved,
    // versioned rule — surface as unavailable, never decide (Part 2 §6.4).
    verdict = 'UNAVAILABLE';
  }
  return {
    ruleId: rule.id,
    verdict,
    // Missing facts block in the early return above; malformed facts block
    // here; optional rules never block the outcome.
    blocking:
      rule.mandatory && (verdict === 'NOT_MET' || verdict === 'INFO_MISSING'),
    entered,
  };
}

// Overall reflects mandatory rules only, ranked worst-first per the §6.4
// outcome table — a mandatory verification or unevaluable rule surfaces
// instead of a false pass. Empty rule sets yield UNAVAILABLE, never a pass.
const MANDATORY_ORDER: GuidanceVerdict[] = [
  'NOT_MET',
  'INFO_MISSING',
  'NEEDS_VERIFICATION',
  'UNAVAILABLE',
  'APPEARS_MET',
];

export function evaluateGuidance(
  rules: RequirementRule[],
  facts: Record<string, RequirementFact>,
): GuidanceEvaluation {
  const results = rules.map((rule) => evaluateRule(rule, facts[rule.id]));
  const mandatory = results.filter(
    (r) => rules.find((rule) => rule.id === r.ruleId)?.mandatory,
  );
  const overall =
    rules.length === 0
      ? 'UNAVAILABLE'
      : (MANDATORY_ORDER.find((v) => mandatory.some((r) => r.verdict === v)) ??
        'APPEARS_MET');
  return { results, overall };
}

/**
 * Latest rule version wins per rule key (unique is programme+ruleKey+version;
 * without this, concurrent versions collide on facts keys and React keys).
 */
export function selectLatestRules<
  T extends { ruleKey: string; version: number },
>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const current = latest.get(row.ruleKey);
    if (!current || row.version > current.version) {
      latest.set(row.ruleKey, row);
    }
  }
  return [...latest.values()];
}

/** Only OPEN offerings may start an application (Part 2 §4E). */
export function canStartApplication(status: AvailabilityStatus): boolean {
  return status === 'OPEN';
}

export const MAX_COMPARISON = CATALOGUE_V1.compareMax;

/** Comparison holds at most three offerings; excess is flagged, not ranked. */
export function limitComparison(
  ids: string[],
  max: number = MAX_COMPARISON,
): { items: string[]; truncated: boolean } {
  return { items: ids.slice(0, max), truncated: ids.length > max };
}
