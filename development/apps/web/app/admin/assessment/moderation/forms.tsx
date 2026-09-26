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

// Moderator decision form: begin review, then approve, return, clarify
// or refer. Non-approvals demand a reason; every submit carries a fresh
// idempotency key and the reviewed version, so concurrent decisions
// conflict instead of silently overwriting.
export function ModerationDecisionForm({
  caseId,
  version,
}: {
  caseId: string;
  version: number;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function decide(to: string, reason: string) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      if (to === "BEGIN") {
        await postAssessment(`/moderation/${caseId}/begin`, {
          idempotencyKey: crypto.randomUUID(),
        });
        setNotice("Review begun. The case is now under moderation.");
      } else {
        await postAssessment(`/moderation/${caseId}/decide`, {
          version,
          to,
          reason: reason || undefined,
          idempotencyKey: crypto.randomUUID(),
        });
        setNotice(
          to === "APPROVED"
            ? "Batch approved. Official CA records written; the batch is locked."
            : `Case ${to.toLowerCase().replace(/_/g, " ")}. History preserved.`,
        );
      }
      router.refresh();
    } catch (error) {
      const detail = (error as { detail?: { code?: string } }).detail;
      setErrors([
        {
          fieldId: "moderation-decision-reason",
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
        const to = String(data.get("moderation-decision-to") ?? "BEGIN");
        void decide(to, String(data.get("moderation-decision-reason") ?? ""));
      }}
    >
      {errors.length > 0 ? (
        <ErrorSummary title="The decision was not recorded" errors={errors} />
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      <label htmlFor="moderation-decision-to">Decision</label>{" "}
      <select id="moderation-decision-to" name="moderation-decision-to">
        <option value="BEGIN">Begin review</option>
        <option value="APPROVED">Approve</option>
        <option value="RETURNED">Return for correction</option>
        <option value="CLARIFICATION_REQUESTED">Request clarification</option>
        <option value="REFERRED">Refer to examinations</option>
      </select>{" "}
      <label htmlFor="moderation-decision-reason">
        Reason (required unless approving)
      </label>{" "}
      <input
        id="moderation-decision-reason"
        name="moderation-decision-reason"
        type="text"
        autoComplete="off"
      />{" "}
      <button type="submit" disabled={pending}>
        Record decision
      </button>
    </form>
  );
}
