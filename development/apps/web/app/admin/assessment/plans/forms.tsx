"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

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
    const detail = (error as {
      detail?: { supportReference?: string; code?: string; currentVersion?: number };
    }).detail;
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
export function PlanForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function draft(form: HTMLFormElement) {
    if (pending) return;
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
      setNotice(
        `Plan drafted (v${out.version ?? "?"}). A second officer must approve it on the decision page.`,
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "plan-offering", message: failure(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The plan was not drafted" errors={errors} />
      ) : null}
      <h2>Draft plan</h2>
      <form
        aria-label="Draft assessment plan"
        onSubmit={(e) => {
          e.preventDefault();
          void draft(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="plan-offering">Offering reference</label>{" "}
          <input
            id="plan-offering"
            name="plan-offering"
            type="text"
            maxLength={64}
            required
            placeholder="SWE-2026S1"
          />
        </p>
        <p>
          <label htmlFor="plan-period">Period code</label>{" "}
          <input
            id="plan-period"
            name="plan-period"
            type="text"
            maxLength={16}
            required
            placeholder="2026S1"
          />
        </p>
        <fieldset>
          <legend>Components (ASSESSMENT-DEMO-v1, fictional demo scheme)</legend>
          <p>
            <label htmlFor="plan-component-1-code">Component 1 code</label>{" "}
            <input
              id="plan-component-1-code"
              name="plan-component-1-code"
              type="text"
              maxLength={32}
              required
              defaultValue="CA-QUIZ1"
            />{" "}
            <label htmlFor="plan-component-1-max">Component 1 max mark</label>{" "}
            <input
              id="plan-component-1-max"
              name="plan-component-1-max"
              type="number"
              min={1}
              required
              defaultValue={20}
            />{" "}
            <label htmlFor="plan-component-1-weight">Component 1 weight</label>{" "}
            <input
              id="plan-component-1-weight"
              name="plan-component-1-weight"
              type="number"
              min={0}
              required
              defaultValue={20}
            />
          </p>
          <p>
            <label htmlFor="plan-component-2-code">Component 2 code</label>{" "}
            <input
              id="plan-component-2-code"
              name="plan-component-2-code"
              type="text"
              maxLength={32}
              required
              defaultValue="CA-ASSIGN"
            />{" "}
            <label htmlFor="plan-component-2-max">Component 2 max mark</label>{" "}
            <input
              id="plan-component-2-max"
              name="plan-component-2-max"
              type="number"
              min={1}
              required
              defaultValue={30}
            />{" "}
            <label htmlFor="plan-component-2-weight">Component 2 weight</label>{" "}
            <input
              id="plan-component-2-weight"
              name="plan-component-2-weight"
              type="number"
              min={0}
              required
              defaultValue={20}
            />
          </p>
          <p>
            <label htmlFor="plan-component-3-code">Component 3 code</label>{" "}
            <input
              id="plan-component-3-code"
              name="plan-component-3-code"
              type="text"
              maxLength={32}
              required
              defaultValue="FINAL-EXAM"
            />{" "}
            <label htmlFor="plan-component-3-max">Component 3 max mark</label>{" "}
            <input
              id="plan-component-3-max"
              name="plan-component-3-max"
              type="number"
              min={1}
              required
              defaultValue={100}
            />{" "}
            <label htmlFor="plan-component-3-weight">Component 3 weight</label>{" "}
            <input
              id="plan-component-3-weight"
              name="plan-component-3-weight"
              type="number"
              min={0}
              required
              defaultValue={60}
            />
          </p>
        </fieldset>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Drafting…" : "Draft plan"}
          </button>
        </p>
      </form>
    </>
  );
}
