"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";
import { NavigationIcon } from "../../../navigation-icon";
import styles from "../workspace.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postAssessment(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/assessment${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { message?: string }).message ??
        "The assessment service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (
      error as {
        detail?: {
          supportReference?: string;
          code?: string;
          currentVersion?: number;
        };
      }
    ).detail;
    const base = `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
    if (detail?.code === "VERSION_CONFLICT" && detail?.currentVersion != null)
      return `${base} Current version: v${detail.currentVersion}. Reload the list and try again with the current version.`;
    return base;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Lecturer plan-draft workspace: offering+period plus the closed
// ASSESSMENT-DEMO-v1 scheme components (code, max mark, weight; weights
// total 100). Every submit carries a fresh idempotency key; the list
// refreshes after the write and the version is shown.
export function PlanForms({ canDraft = false }: { canDraft?: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function draft(form: HTMLFormElement) {
    if (pending || !canDraft) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const components = [1, 2, 3].map((n) => ({
        code: String(data.get(`plan-component-${n}-code`) ?? ""),
        maxMark: Number(data.get(`plan-component-${n}-max`) ?? 0),
        weight: Number(data.get(`plan-component-${n}-weight`) ?? 0),
      }));
      const out = (await postAssessment("/plans", {
        offeringRef: String(data.get("plan-offering") ?? ""),
        periodCode: String(data.get("plan-period") ?? ""),
        components,
        idempotencyKey: crypto.randomUUID(),
      })) as { version?: number; id?: string };
      form.reset();
      setNotice(
        `Plan drafted (v${out.version ?? "?"}). A second officer must approve it on the decision page.`,
      );
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "plan-offering", message: failure(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="draft-plan-heading">
      <div className={styles.panelHeading}>
        <span className={styles.sectionIcon}>
          <NavigationIcon href="/admin/assessment/plans" />
        </span>
        <div>
          <h2 id="draft-plan-heading">Draft plan</h2>
          <p>
            Create a draft assessment plan for an offering and define its
            assessment components.
          </p>
        </div>
      </div>
      {notice ? (
        <Notice severity="success" title="Plan saved" message={notice} />
      ) : null}
      {errors.length ? (
        <ErrorSummary title="The plan was not drafted" errors={errors} />
      ) : null}
      {!canDraft ? (
        <p className={styles.permissionHint}>
          Switch to an appointed lecturer workspace to draft a plan.
        </p>
      ) : null}
      <form
        aria-label="Draft assessment plan"
        aria-busy={pending}
        onReset={() => {
          setErrors([]);
          setNotice(null);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          void draft(e.currentTarget);
        }}
      >
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="plan-offering">
              Offering reference <span aria-hidden="true">*</span>
            </label>
            <input
              id="plan-offering"
              name="plan-offering"
              maxLength={64}
              required
              placeholder="SWE-2026S1"
              aria-describedby="offering-hint"
            />
            <small id="offering-hint">
              Unique reference for this offering, such as course and period.
            </small>
          </div>
          <div className={styles.field}>
            <label htmlFor="plan-period">
              Period code <span aria-hidden="true">*</span>
            </label>
            <input
              id="plan-period"
              name="plan-period"
              maxLength={16}
              required
              placeholder="2026S1"
              aria-describedby="period-hint"
            />
            <small id="period-hint">Academic period code.</small>
          </div>
        </div>
        <fieldset className={styles.components}>
          <legend>Assessment components</legend>
          <p className={styles.supporting}>
            Define the components, maximum marks and weights. Weights must total
            100%.
          </p>
          <div className={styles.componentHead} aria-hidden="true">
            <span>#</span>
            <span>Component code *</span>
            <span>Max mark *</span>
            <span>Weight (%) *</span>
          </div>
          {[
            ["CA-QUIZ1", 20, 20],
            ["CA-ASSIGN", 30, 20],
            ["FINAL-EXAM", 100, 60],
          ].map(([code, max, weight], index) => {
            const n = index + 1;
            return (
              <div className={styles.componentRow} key={n}>
                <span className={styles.rowNumber} aria-hidden="true">
                  {n}
                </span>
                <div className={styles.field}>
                  <label
                    className={styles.rowLabel}
                    htmlFor={`plan-component-${n}-code`}
                  >
                    Component {n} code
                  </label>
                  <input
                    id={`plan-component-${n}-code`}
                    name={`plan-component-${n}-code`}
                    maxLength={32}
                    required
                    defaultValue={code}
                  />
                </div>
                <div className={styles.field}>
                  <label
                    className={styles.rowLabel}
                    htmlFor={`plan-component-${n}-max`}
                  >
                    Component {n} max mark
                  </label>
                  <input
                    id={`plan-component-${n}-max`}
                    name={`plan-component-${n}-max`}
                    type="number"
                    min={1}
                    required
                    defaultValue={max}
                  />
                </div>
                <div className={styles.field}>
                  <label
                    className={styles.rowLabel}
                    htmlFor={`plan-component-${n}-weight`}
                  >
                    Component {n} weight
                  </label>
                  <input
                    id={`plan-component-${n}-weight`}
                    name={`plan-component-${n}-weight`}
                    type="number"
                    min={0}
                    max={100}
                    required
                    defaultValue={weight}
                  />
                </div>
              </div>
            );
          })}
        </fieldset>
        <div className={styles.actions}>
          <button type="submit" disabled={pending || !canDraft}>
            <NavigationIcon href="/admin/assessment/plans" />
            {pending ? "Drafting…" : "Draft plan"}
          </button>
          <button
            className={styles.secondary}
            type="reset"
            disabled={pending || !canDraft}
          >
            Reset
          </button>
        </div>
        <details className={styles.policy}>
          <summary>Assessment policy</summary>
          <p>
            This demonstration uses ASSESSMENT-DEMO-v1. An independent officer
            must approve a saved plan; drafting does not release results.
          </p>
        </details>
      </form>
    </section>
  );
}
