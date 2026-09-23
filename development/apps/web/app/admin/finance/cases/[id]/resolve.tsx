"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postFinance(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/finance${path}`, {
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
        "The finance service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

// Case resolution: match provider evidence, mark duplicate, or escalate.
// Matching confirms at the evidence amount; history is never deleted.
export function ResolveForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function act(
    action: string,
    body: Record<string, unknown>,
    done: string,
  ) {
    if (pending) return;
    setPending(action);
    setErrors([]);
    setNotice(null);
    try {
      await postFinance(`/cases/${caseId}/resolve`, {
        ...body,
        action,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      router.refresh();
    } catch (error) {
      setErrors([
        {
          fieldId: "resolve-note",
          message:
            error instanceof Error
              ? error.message
              : "We could not confirm the result. Check the case before retrying.",
        },
      ]);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Case updated" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The case was not updated" errors={errors} />
      ) : null}
      <form
        aria-label="Resolve reconciliation case"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const action = String(data.get("resolve-action") ?? "");
          const note = String(data.get("resolve-note") ?? "");
          const accepted = Number(data.get("resolve-amount") ?? NaN);
          void act(
            action,
            {
              note: note || undefined,
              acceptedAmountMinor: Number.isInteger(accepted)
                ? accepted
                : undefined,
            },
            action === "ESCALATE"
              ? "Case escalated. It stays open until resolved."
              : "Case resolved. The history below is preserved.",
          );
        }}
      >
        <p>
          <label htmlFor="resolve-action">Action</label>{" "}
          <select id="resolve-action" name="resolve-action" required>
            <option value="">Choose…</option>
            <option value="MATCH_CONFIRM">
              Confirm at the provider evidence amount
            </option>
            <option value="MARK_DUPLICATE">Mark duplicate (no money moves)</option>
            <option value="ESCALATE">Escalate for bank trace</option>
          </select>
        </p>
        <p>
          <label htmlFor="resolve-amount">
            Confirmed amount in tambala (match only)
          </label>{" "}
          <input
            id="resolve-amount"
            name="resolve-amount"
            type="number"
            min={1}
          />
        </p>
        <p>
          <label htmlFor="resolve-note">Officer note</label>{" "}
          <textarea
            id="resolve-note"
            name="resolve-note"
            rows={3}
            maxLength={2000}
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Updating case…" : "Resolve case"}
          </button>
        </p>
      </form>
    </>
  );
}
