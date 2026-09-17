"use client";

import { useState } from "react";
import type { DecideReviewBody, ReviewSchedule } from "@sis/contracts";
import {
  ActionButton,
  DeniedPanel,
  ErrorSummary,
  Field,
  Notice,
  Status,
} from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";

// Offered decisions are the implemented ones only: reduce / reassign /
// change-end-date ride the API enum but answer decision-deferred (GAP-014)
// until the institution specifies their inputs.
const DECISIONS = ["confirm", "revoke", "clarify"] as const;

async function postJson(path: string, payload: DecideReviewBody) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    reference?: string;
  };
  if (!res.ok) {
    const error = new Error(body.message ?? `Review failed (${res.status}).`);
    (error as { status?: number; reference?: string }).status = res.status;
    (error as { status?: number; reference?: string }).reference =
      body.reference;
    throw error;
  }
  return body;
}

export function DecideForm({ review }: { review: ReviewSchedule }) {
  const [decision, setDecision] =
    useState<(typeof DECISIONS)[number]>("confirm");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>(
    [],
  );
  const [denied, setDenied] = useState<{
    message: string;
    reference?: string;
  } | null>(null);
  const [conflict, setConflict] = useState<{
    message: string;
    reference?: string;
  } | null>(null);
  const [done, setDone] = useState(false);
  // No client idempotency key here: repeat decides are guarded server-side
  // (completed reviews answer 409), and each decision carries its own reason.

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors([]);
    setDenied(null);
    setConflict(null);
    const data = new FormData(event.currentTarget);
    const reason = String(data.get("reason") ?? "").trim();
    if (!reason) {
      setErrors([
        {
          fieldId: "reason",
          message: "Give a reason — it is recorded in the audit trail.",
        },
      ]);
      setPending(false);
      return;
    }
    try {
      await postJson(`/api/auth/reviews/${review.id}/decide`, {
        decision,
        reason,
      });
      setDone(true);
    } catch (error) {
      const status = (error as { status?: number }).status;
      const reference = (error as { reference?: string }).reference;
      const message = error instanceof Error ? error.message : "Review failed.";
      if (status === 403 || status === 401) {
        setDenied({
          message: `${message}${reference ? ` (Reference: ${reference})` : ""}`,
        });
      } else if (status === 409) {
        // Someone else decided first: a distinct conflict notice, never a
        // field error — the form entries were fine.
        setConflict({
          message: `${message}${reference ? ` (Reference: ${reference})` : ""}`,
        });
      } else {
        setErrors([
          {
            fieldId: "reason",
            message: `${message}${reference ? ` (Reference: ${reference})` : ""}`,
          },
        ]);
      }
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Notice
        severity="success"
        title="Review recorded"
        message={`Decision ${decision} was recorded with its reason and audit reference.`}
        action={{ label: "Back to queue", href: "/admin/reviews" }}
      />
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <Status
        severity="neutral"
        state={`${review.riskLevel} risk · due ${formatLusaka(review.nextDueAt)}`}
        reason={`Assignment ${review.assignmentId} · cadence ${review.cadence}`}
        action="One decision per review. Revoke takes effect immediately and can be reinstated with reason."
      />
      <ErrorSummary title="We could not record this review." errors={errors} />
      {denied ? (
        <DeniedPanel message={denied.message} reference={denied.reference} />
      ) : null}
      {conflict ? (
        <Notice
          severity="warning"
          title="Already decided"
          message={`${conflict.message} Reload the queue to see the current state.`}
          action={{ label: "Back to queue", href: "/admin/reviews" }}
        />
      ) : null}
      <fieldset>
        <legend>Decision</legend>
        {DECISIONS.map((option) => (
          <label key={option} htmlFor={`decision-${option}`}>
            <input
              id={`decision-${option}`}
              name="decision"
              type="radio"
              value={option}
              checked={decision === option}
              onChange={() => setDecision(option)}
            />
            {option}
          </label>
        ))}
      </fieldset>
      {decision === "revoke" ? (
        <Notice
          severity="warning"
          title="Consequence preview"
          message="The assignment is revoked at once and the person's workspace drops to empty. Drafts are preserved and the decision can be reinstated with reason — history is never edited."
        />
      ) : null}
      <Field
        id="reason"
        label="Reason"
        help="Recorded in the audit trail with your identity. Minimum 8 characters."
        error={errors.find((e) => e.fieldId === "reason")?.message}
        inputProps={{ name: "reason", maxLength: 512 }}
      />
      <ActionButton
        kind={decision === "revoke" ? "destructive" : "primary"}
        pending={pending}
        loadingText="Recording…"
      >
        Record {decision}
      </ActionButton>
    </form>
  );
}
