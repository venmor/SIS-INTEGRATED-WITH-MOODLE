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

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Arrangement decisions live with the approver. Approval grants a
// time-boxed clearance entitlement; declines change nothing.
export function ArrangementDecide() {
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
      const out = (await postFinance(
        `/arrangements/${String(data.get("arrange-id") ?? "")}/decide`,
        {
          approve: String(data.get("arrange-outcome") ?? "") === "approve",
          note: String(data.get("arrange-note") ?? "") || undefined,
          idempotencyKey: crypto.randomUUID(),
        },
      )) as { status?: string };
      setNotice(`Arrangement decided (${out.status ?? "unknown"}).`);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "arrange-id", message: failure(error) }]);
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
        <ErrorSummary title="The arrangement was not decided" errors={errors} />
      ) : null}
      <form
        aria-label="Decide payment arrangement"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="arrange-id">Arrangement ID</label>{" "}
          <input id="arrange-id" name="arrange-id" type="text" required />
        </p>
        <p>
          <label htmlFor="arrange-outcome">Decision</label>{" "}
          <select id="arrange-outcome" name="arrange-outcome" required>
            <option value="">Choose…</option>
            <option value="approve">Approve</option>
            <option value="decline">Decline</option>
          </select>
        </p>
        <p>
          <label htmlFor="arrange-note">Note (required to decline)</label>{" "}
          <textarea id="arrange-note" name="arrange-note" rows={2} maxLength={2000} />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Deciding…" : "Decide arrangement"}
          </button>
        </p>
      </form>
    </>
  );
}
