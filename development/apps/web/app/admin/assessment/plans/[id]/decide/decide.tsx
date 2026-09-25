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

// UI-DECISION-001 plan approval logic: the signatory confirms the frozen
// version with the exact declaration. Fresh idempotency key per attempt;
// version shown and VERSION_CONFLICT surfaces the current version.
export function PlanDecideForm({
  planId,
  version,
}: {
  planId: string;
  version: number;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      if (data.get("plan-declaration") !== "confirmed")
        throw new Error(
          "Confirm the declaration before approving this plan.",
        );
      const out = (await postAssessment(`/plans/${planId}/approve`, {
        version,
        idempotencyKey: crypto.randomUUID(),
      })) as { status?: string; version?: number };
      setNotice(
        `Plan approved (${out.status ?? "APPROVED"}, v${out.version ?? version}). A second officer decided; the creator cannot self-approve.`,
      );
      router.refresh();
    } catch (error) {
      setErrors([
        {
          fieldId: "plan-declaration",
          message: failure(error),
        },
      ]);
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
        <ErrorSummary title="The plan was not approved" errors={errors} />
      ) : null}
      <form
        aria-label="Approve assessment plan"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>Version v{version} is the frozen evidence you sign.</p>
        <p>
          <label htmlFor="plan-declaration">
            <input
              id="plan-declaration"
              name="plan-declaration"
              type="checkbox"
              value="confirmed"
              required
            />{" "}
            I confirm that I have reviewed the stated evidence and make this
            decision within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Approving…" : "Approve plan"}
          </button>
        </p>
      </form>
    </>
  );
}
