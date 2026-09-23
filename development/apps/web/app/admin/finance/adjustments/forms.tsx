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
    const detail = (error as { detail?: { supportReference?: string; code?: string } })
      .detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Adjustment workspace: officers request with reason and evidence;
// approvers decide elsewhere-in-role (maker/checker). Approved credits
// post compensating lines; refunds record payout references.
export function AdjustmentForms({ attemptId }: { attemptId?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(kind: "request" | "decide", form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      if (kind === "request") {
        await postFinance("/adjustments", {
          attemptId: attemptId ?? String(data.get("adjust-attempt") ?? ""),
          kind: String(data.get("adjust-kind") ?? ""),
          amountMinor: Number(data.get("adjust-amount") ?? 0),
          reason: String(data.get("adjust-reason") ?? ""),
          evidenceNote: String(data.get("adjust-evidence") ?? "") || undefined,
          idempotencyKey: crypto.randomUUID(),
        });
        setNotice("Adjustment requested. A separate approver must decide it.");
      } else {
        const out = (await postFinance(
          `/adjustments/${String(data.get("decide-id") ?? "")}/decide`,
          {
            approve: String(data.get("decide-outcome") ?? "") === "approve",
            note: String(data.get("decide-note") ?? "") || undefined,
            payoutReference:
              String(data.get("decide-payout") ?? "") || undefined,
            idempotencyKey: crypto.randomUUID(),
          },
        )) as { status?: string };
        setNotice(`Adjustment decided (${out.status ?? "unknown"}).`);
      }
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "adjust-kind", message: failure(error) }]);
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
        <ErrorSummary title="The adjustment was not recorded" errors={errors} />
      ) : null}
      <form
        aria-label="Request finance adjustment"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("request", e.currentTarget);
        }}
      >
        {!attemptId ? (
          <p>
            <label htmlFor="adjust-attempt">Programme attempt ID</label>{" "}
            <input id="adjust-attempt" name="adjust-attempt" type="text" required />
          </p>
        ) : null}
        <p>
          <label htmlFor="adjust-kind">Kind</label>{" "}
          <select id="adjust-kind" name="adjust-kind" required>
            <option value="">Choose…</option>
            <option value="CREDIT_NOTE">Credit note</option>
            <option value="WAIVER">Waiver</option>
            <option value="REFUND">Refund</option>
          </select>
        </p>
        <p>
          <label htmlFor="adjust-amount">Amount in tambala</label>{" "}
          <input id="adjust-amount" name="adjust-amount" type="number" min={1} required />
        </p>
        <p>
          <label htmlFor="adjust-reason">Reason</label>{" "}
          <textarea id="adjust-reason" name="adjust-reason" rows={3} maxLength={2000} required />
        </p>
        <p>
          <label htmlFor="adjust-evidence">
            Evidence reference (required for high value)
          </label>{" "}
          <input id="adjust-evidence" name="adjust-evidence" type="text" maxLength={2000} />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Requesting…" : "Request adjustment"}
          </button>
        </p>
      </form>
      <h2>Decide adjustment (approver only)</h2>
      <form
        aria-label="Decide finance adjustment"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("decide", e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="decide-id">Adjustment ID</label>{" "}
          <input id="decide-id" name="decide-id" type="text" required />
        </p>
        <p>
          <label htmlFor="decide-outcome">Decision</label>{" "}
          <select id="decide-outcome" name="decide-outcome" required>
            <option value="">Choose…</option>
            <option value="approve">Approve</option>
            <option value="decline">Decline</option>
          </select>
        </p>
        <p>
          <label htmlFor="decide-note">Note (required to decline)</label>{" "}
          <textarea id="decide-note" name="decide-note" rows={2} maxLength={2000} />
        </p>
        <p>
          <label htmlFor="decide-payout">
            Payout reference (required for refunds)
          </label>{" "}
          <input id="decide-payout" name="decide-payout" type="text" maxLength={64} />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Deciding…" : "Decide adjustment"}
          </button>
        </p>
      </form>
    </>
  );
}
