"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AUTH_MESSAGES } from "@sis/config";
import { ActionButton } from "@sis/ui";
import { ErrorSummary } from "@sis/ui";
import { Field } from "@sis/ui";
import { GuidanceResult } from "@sis/ui";
import type { GuidanceOutcome } from "@sis/ui";
import { Notice } from "@sis/ui";
import type { RequirementRule } from "@sis/contracts";

interface WizardProps {
  offeringId: string;
  programmeName: string;
  intake: string;
  canStart: boolean;
  closedNote: string | null;
  routes: Array<{ code: string; label: string }>;
  rules: RequirementRule[];
}

type Step = "route" | "facts" | "review" | "result";

interface FactState {
  value: string;
  unknown: boolean;
}

interface ResultRow {
  ruleId: string;
  verdict: string;
  blocking: boolean;
}

const VERDICT_TEXT: Record<string, string> = {
  APPEARS_MET: AUTH_MESSAGES.verdictMet.text,
  NEEDS_VERIFICATION: AUTH_MESSAGES.verdictVerify.text,
  INFO_MISSING: AUTH_MESSAGES.verdictMissing.text,
  NOT_MET: AUTH_MESSAGES.verdictNotMet.text,
  UNAVAILABLE: AUTH_MESSAGES.guidanceUnavailable.text,
};

const VERDICT_TONE: Record<string, "success" | "attention" | "info" | "error"> =
  {
    APPEARS_MET: "success",
    NEEDS_VERIFICATION: "attention",
    INFO_MISSING: "info",
    NOT_MET: "error",
    UNAVAILABLE: "info",
  };

const GRADE_HINT = AUTH_MESSAGES.gradeHint.text;

// Eligibility-guidance wizard (Part 2 §6.3): route → facts → review →
// result. Facts live in component state only (session-only retention §6.3);
// the server session holds offering + route, never personal data.
export function EligibilityForm({
  offeringId,
  programmeName,
  intake,
  canStart,
  closedNote,
  routes,
  rules,
}: WizardProps) {
  const [step, setStep] = useState<Step>("route");
  const [routeCode, setRouteCode] = useState(routes[0]?.code ?? "");
  const [facts, setFacts] = useState<Record<string, FactState>>({});
  // Dirty tracks in-DOM edits (uncontrolled inputs) so route changes never
  // silently discard typed values — the confirm appears on dirty, not only
  // on submitted state.
  const [dirty, setDirty] = useState(false);
  // Per-field remount keys clear a grade box when "unknown" is chosen
  // without direct DOM mutation.
  const [resetKeys, setResetKeys] = useState<Record<string, number>>({});
  // Step titles receive focus on transition (repo focus pattern); no global
  // live region (single announcements, never whole-wizard re-reads).
  const stepTitleRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    stepTitleRef.current?.focus();
  }, [step]);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Array<{ fieldId: string; message: string }>
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    rows: ResultRow[];
    overall: string;
    labels: Record<string, { label: string; evidence: string }>;
  } | null>(null);

  const applicable = rules.filter(
    (rule) => rule.routeCode === null || rule.routeCode === routeCode,
  );

  function setFact(ruleId: string, patch: Partial<FactState>) {
    setFacts((prev) => {
      const previous = prev[ruleId];
      const current: FactState = {
        value: previous?.value ?? "",
        unknown: previous?.unknown ?? false,
      };
      if (patch.value !== undefined) current.value = patch.value;
      if (patch.unknown !== undefined) current.unknown = patch.unknown;
      return { ...prev, [ruleId]: current };
    });
  }

  function validateGrade(value: string): string | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9)
      return GRADE_HINT;
    return null;
  }

  function startFacts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const chosen = String(data.get("routeCode") ?? "");
    if (!routes.some((route) => route.code === chosen)) {
      setFieldErrors([
        {
          fieldId: "guide-route",
          message: "Choose a listed qualification route.",
        },
      ]);
      return;
    }
    setFieldErrors([]);
    setRouteCode(chosen);
    setFacts({});
    setDirty(false);
    setConfirmRestart(false);
    setStep("facts");
  }

  function requestRouteChange() {
    if (!dirty && Object.keys(facts).length === 0) {
      setStep("route");
      return;
    }
    setConfirmRestart(true);
  }

  function submitFacts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Uncontrolled inputs live in the DOM (house pattern); merge them into
    // state here so review/result render from one source. Unknown flags live
    // in state (checkboxes carry no form names).
    const data = new FormData(event.currentTarget);
    const next: Record<string, FactState> = { ...facts };
    for (const rule of applicable) {
      const stored = next[rule.id];
      const current: FactState = {
        value: stored?.value ?? "",
        unknown: stored?.unknown ?? false,
      };
      const raw = data.get(`fact-${rule.id}`);
      if (typeof raw === "string") current.value = raw;
      next[rule.id] = current;
    }
    setFacts(next);
    const errors: Array<{ fieldId: string; message: string }> = [];
    for (const rule of applicable) {
      const fact = next[rule.id];
      if (rule.kind === "GRADE" && fact && !fact.unknown) {
        const problem = validateGrade(fact.value);
        if (problem)
          errors.push({ fieldId: `guide-${rule.id}`, message: problem });
      }
    }
    setFieldErrors(errors);
    if (errors.length === 0) setStep("review");
  }

  async function submitGuidance() {
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      const sessionRes = await fetch("/api/catalogue/guidance/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({ offeringId, routeCode }),
      });
      if (!sessionRes.ok) throw new Error("session");
      const session = (await sessionRes.json()) as { sessionId: string };
      const payload: Record<
        string,
        { value?: string | number | boolean; unknown?: boolean }
      > = {};
      for (const rule of applicable) {
        const fact = facts[rule.id];
        if (!fact) continue;
        if (fact.unknown) {
          payload[rule.id] = { unknown: true };
          continue;
        }
        if (rule.kind === "GRADE") {
          if (fact.value.trim())
            payload[rule.id] = { value: Number(fact.value) };
        } else if (rule.kind === "BOOLEAN") {
          if (fact.value === "yes") payload[rule.id] = { value: true };
          if (fact.value === "no") payload[rule.id] = { value: false };
        } else if (fact.value.trim()) {
          payload[rule.id] = { value: fact.value.trim() };
        }
      }
      const evalRes = await fetch("/api/catalogue/guidance/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId: session.sessionId, facts: payload }),
      });
      const body = (await evalRes.json()) as {
        results?: ResultRow[];
        overall?: string;
        message?: string;
      };
      if (!evalRes.ok || !body.results || !body.overall) {
        throw new Error(body.message ?? "evaluate");
      }
      const labels: Record<string, { label: string; evidence: string }> = {};
      for (const rule of applicable) {
        labels[rule.id] = { label: rule.label, evidence: rule.evidence };
      }
      setResult({ rows: body.results, overall: body.overall, labels });
      setStep("result");
    } catch {
      setFormError(
        `Guidance could not run right now. ${AUTH_MESSAGES.keptState.text}`,
      );
    } finally {
      setPending(false);
    }
  }

  function enteredText(ruleId: string): string {
    const fact = facts[ruleId];
    if (!fact || (!fact.value && !fact.unknown))
      return "No information entered.";
    if (fact.unknown) return "You chose “I do not know this result yet.”";
    if (fact.value === "yes") return "You answered yes.";
    if (fact.value === "no") return "You answered no.";
    return `You entered ${fact.value}.`;
  }

  const routeLabel =
    routes.find((route) => route.code === routeCode)?.label ?? routeCode;
  const outcomes: GuidanceOutcome[] = (result?.rows ?? []).map((row) => ({
    ruleId: row.ruleId,
    label: result?.labels[row.ruleId]?.label ?? row.ruleId,
    enteredText: enteredText(row.ruleId),
    verdictText: VERDICT_TEXT[row.verdict] ?? row.verdict,
    verdictTone: VERDICT_TONE[row.verdict] ?? "info",
  }));

  return (
    <div>
      {step === "route" ? (
        <form onSubmit={startFacts} aria-label="Choose qualification route">
          <h2 ref={stepTitleRef} tabIndex={-1}>
            Choose qualification route
          </h2>
          {fieldErrors.length > 0 ? (
            <ErrorSummary title="There is a problem" errors={fieldErrors} />
          ) : null}
          <label htmlFor="guide-route">Qualification route</label>
          <select id="guide-route" name="routeCode" defaultValue={routeCode}>
            {routes.map((route) => (
              <option key={route.code} value={route.code}>
                {route.label}
              </option>
            ))}
          </select>
          <p>
            <ActionButton type="submit">Continue</ActionButton>
          </p>
        </form>
      ) : null}

      {step === "facts" ? (
        <form
          onSubmit={submitFacts}
          onChange={() => setDirty(true)}
          aria-label="Enter qualifications"
        >
          <h2 ref={stepTitleRef} tabIndex={-1}>
            Enter qualifications
          </h2>
          <p>
            <button type="button" onClick={requestRouteChange}>
              Change qualification route
            </button>
          </p>
          {confirmRestart ? (
            <Notice
              severity="warning"
              title="Requirements differ by route"
              message="Changing route restarts this check with different requirements. Entered information will be cleared."
            />
          ) : null}
          {confirmRestart ? (
            <p>
              <ActionButton
                kind="secondary"
                type="button"
                pending={false}
                onClick={() => {
                  setFacts({});
                  setDirty(false);
                  setConfirmRestart(false);
                  setStep("route");
                }}
              >
                Restart with a new route
              </ActionButton>
            </p>
          ) : null}
          {fieldErrors.length > 0 ? (
            <ErrorSummary title="There is a problem" errors={fieldErrors} />
          ) : null}
          {applicable.map((rule) => (
            <div key={rule.id}>
              {rule.kind === "GRADE" ? (
                <div key={`${rule.id}-${resetKeys[rule.id] ?? 0}`}>
                  <Field
                    id={`guide-${rule.id}`}
                    label={`${rule.label} grade`}
                    help={`Required evidence: ${rule.evidence}. ${GRADE_HINT}`}
                    error={
                      fieldErrors.find((e) => e.fieldId === `guide-${rule.id}`)
                        ?.message
                    }
                    inputProps={{
                      type: "text",
                      name: `fact-${rule.id}`,
                      maxLength: 8,
                    }}
                  />
                  <p>
                    <label>
                      <input
                        type="checkbox"
                        checked={facts[rule.id]?.unknown ?? false}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          const patch: Partial<FactState> = {
                            unknown: checked,
                          };
                          if (checked) patch.value = "";
                          setFact(rule.id, patch);
                          if (checked) {
                            setResetKeys((prev) => ({
                              ...prev,
                              [rule.id]: (prev[rule.id] ?? 0) + 1,
                            }));
                          }
                        }}
                      />{" "}
                      I do not know this result yet
                    </label>
                  </p>
                </div>
              ) : null}
              {rule.kind === "BOOLEAN" ? (
                <fieldset>
                  <legend>{rule.label}</legend>
                  <p>Required evidence: {rule.evidence}.</p>
                  <p>
                    <label>
                      <input
                        type="radio"
                        name={`fact-${rule.id}`}
                        value="yes"
                        checked={
                          facts[rule.id]?.value === "yes" &&
                          !facts[rule.id]?.unknown
                        }
                        onChange={() =>
                          setFact(rule.id, { value: "yes", unknown: false })
                        }
                      />{" "}
                      Yes
                    </label>{" "}
                    <label>
                      <input
                        type="radio"
                        name={`fact-${rule.id}`}
                        value="no"
                        checked={
                          facts[rule.id]?.value === "no" &&
                          !facts[rule.id]?.unknown
                        }
                        onChange={() =>
                          setFact(rule.id, { value: "no", unknown: false })
                        }
                      />{" "}
                      No
                    </label>{" "}
                    <label>
                      <input
                        type="radio"
                        name={`fact-${rule.id}`}
                        value="unknown"
                        checked={facts[rule.id]?.unknown ?? false}
                        onChange={() =>
                          setFact(rule.id, { value: "", unknown: true })
                        }
                      />{" "}
                      I do not know yet
                    </label>
                  </p>
                </fieldset>
              ) : null}
              {rule.kind === "TEXT" ? (
                <div key={`text-${rule.id}-${resetKeys[rule.id] ?? 0}`}>
                  <Field
                    id={`guide-${rule.id}`}
                    label={rule.label}
                    help={`Required evidence: ${rule.evidence}.`}
                    inputProps={{ type: "text", name: `fact-${rule.id}` }}
                  />
                  <p>
                    <label>
                      <input
                        type="checkbox"
                        checked={facts[rule.id]?.unknown ?? false}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          const patch: Partial<FactState> = {
                            unknown: checked,
                          };
                          if (checked) patch.value = "";
                          setFact(rule.id, patch);
                          if (checked) {
                            setResetKeys((prev) => ({
                              ...prev,
                              [rule.id]: (prev[rule.id] ?? 0) + 1,
                            }));
                          }
                        }}
                      />{" "}
                      I do not know this yet
                    </label>
                  </p>
                </div>
              ) : null}
            </div>
          ))}
          <p>
            <ActionButton type="submit">Review information</ActionButton>
          </p>
        </form>
      ) : null}

      {step === "review" ? (
        <div>
          <h2 ref={stepTitleRef} tabIndex={-1}>
            Review entered information
          </h2>
          <ul>
            {applicable.map((rule) => (
              <li key={rule.id}>
                <strong>{rule.label}:</strong> {enteredText(rule.id)}
              </li>
            ))}
          </ul>
          {formError ? (
            <Notice
              severity="error"
              title="Guidance failed"
              message={formError}
            />
          ) : null}
          <p>
            <ActionButton
              type="button"
              pending={pending}
              loadingText="Checking requirements…"
              onClick={submitGuidance}
            >
              View guidance result
            </ActionButton>
          </p>
          <p>
            <button type="button" onClick={() => setStep("facts")}>
              Change information
            </button>
          </p>
        </div>
      ) : null}

      {step === "result" && result ? (
        <div>
          <h2 ref={stepTitleRef} tabIndex={-1}>
            Guidance result
          </h2>
          <GuidanceResult
            programmeName={programmeName}
            intake={intake}
            routeLabel={routeLabel}
            outcomes={outcomes}
            overallText={
              VERDICT_TEXT[result.overall] ??
              AUTH_MESSAGES.guidanceUnavailable.text
            }
            disclaimer={AUTH_MESSAGES.guidanceDisclaimer.text}
          />
          <p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setStep("route");
              }}
            >
              Change information
            </button>{" "}
            <Link href="/discover">Compare another programme</Link>
          </p>
          {canStart ? (
            <p>
              <Link
                href={`/applicant/start?offeringId=${encodeURIComponent(offeringId)}&routeCode=${encodeURIComponent(routeCode)}`}
              >
                Start application
              </Link>{" "}
              (account required).
            </p>
          ) : (
            <p>{closedNote ?? "Applications cannot be started right now."}</p>
          )}
          <p>
            This guidance is not an admission decision. Review your
            qualifications in your application before submitting.
          </p>
        </div>
      ) : null}
    </div>
  );
}
