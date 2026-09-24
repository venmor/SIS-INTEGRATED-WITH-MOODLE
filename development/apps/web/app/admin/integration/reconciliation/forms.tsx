"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postIntegration(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/integration${path}`, {
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
        "The integration service could not complete this request.",
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

// Reconciliation runs and governed resolutions. Safe diffs repair by
// requeue; activating SIS records, editing payloads or deleting rows
// are refused. Resolutions need evidence, never bare notes.
export function ReconForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function act(
    path: string,
    body: Record<string, unknown>,
    done: string,
    form?: HTMLFormElement | null,
  ) {
    if (pending) return;
    setPending(path);
    setErrors([]);
    setNotice(null);
    try {
      const out = (await postIntegration(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      })) as { diffs?: number; repaired?: number; cases?: number; status?: string };
      const summary =
        out.diffs !== undefined
          ? ` Run found ${out.diffs} differences, repaired ${out.repaired}, opened ${out.cases} cases.`
          : ` Case is now ${out.status ?? "updated"}.`;
      setNotice(done + summary);
      form?.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "recon-case", message: failure(error) }]);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="Reconciliation did not complete" errors={errors} />
      ) : null}
      <form
        aria-label="Run reconciliation"
        onSubmit={(e) => {
          e.preventDefault();
          void act("/reconciliation/runs", {}, "Reconciliation run completed.", null);
        }}
      >
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Running…" : "Run reconciliation"}
          </button>
        </p>
      </form>
      <h2>Resolve a case</h2>
      <form
        aria-label="Resolve reconciliation case"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            `/reconciliation/cases/${String(data.get("recon-case") ?? "")}/resolve`,
            {
              action: String(data.get("recon-action") ?? ""),
              note: String(data.get("recon-note") ?? "") || undefined,
            },
            "Resolution recorded.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="recon-case">Case ID</label>{" "}
          <input id="recon-case" name="recon-case" type="text" required />
        </p>
        <p>
          <label htmlFor="recon-action">Resolution</label>{" "}
          <select id="recon-action" name="recon-action" required>
            <option value="">Choose…</option>
            <option value="REQUEUE">Requeue for redelivery</option>
            <option value="SUSPEND_ACCESS">Suspend simulator access</option>
            <option value="ESCALATE">Escalate</option>
            <option value="MARK_RESOLVED">Mark resolved with evidence</option>
          </select>
        </p>
        <p>
          <label htmlFor="recon-note">Evidence note</label>{" "}
          <textarea id="recon-note" name="recon-note" rows={3} maxLength={4000} />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Resolving…" : "Resolve case"}
          </button>
        </p>
      </form>
    </>
  );
}
