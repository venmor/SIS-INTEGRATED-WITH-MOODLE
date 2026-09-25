"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@sis/ui";

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

// Examinations triage form: acknowledge, resolve or dismiss a finding.
// Resolve/dismiss demand a reason; every submit carries a fresh
// idempotency key and the reviewed version, so concurrent triage
// conflicts instead of silently overwriting.
export function FindingTransitionForm({
  findingId,
  version,
}: {
  findingId: string;
  version: number;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function transition(to: string, reason: string) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      await postAssessment(`/findings/${findingId}/transition`, {
        version,
        to,
        reason: reason || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(`Finding ${to.toLowerCase()}. Staged marks unchanged.`);
      router.refresh();
    } catch (error) {
      const detail = (error as { detail?: { code?: string } }).detail;
      setErrors([
        {
          fieldId: "finding-transition-reason",
          message:
            error instanceof Error
              ? `${error.message}${detail?.code ? ` (${detail.code})` : ""}`
              : "We could not confirm the result. Check the current state before retrying.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const to = String(data.get("finding-transition-to") ?? "ACKNOWLEDGED");
        void transition(to, String(data.get("finding-transition-reason") ?? ""));
      }}
    >
      {errors.length > 0 ? (
        <ErrorSummary title="The decision was not recorded" errors={errors} />
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      <label htmlFor="finding-transition-to">Decision</label>{" "}
      <select id="finding-transition-to" name="finding-transition-to">
        <option value="ACKNOWLEDGED">Acknowledge</option>
        <option value="RESOLVED">Resolve</option>
        <option value="DISMISSED">Dismiss</option>
      </select>{" "}
      <label htmlFor="finding-transition-reason">
        Reason (required to resolve or dismiss)
      </label>{" "}
      <input
        id="finding-transition-reason"
        name="finding-transition-reason"
        type="text"
        autoComplete="off"
      />{" "}
      <button type="submit" disabled={pending}>
        Record decision
      </button>
    </form>
  );
}
