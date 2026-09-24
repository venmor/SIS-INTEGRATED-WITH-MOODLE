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

// UI-DECISION-001 replay decision page logic: the signatory sees the
// frozen evidence version, gives a reason, and signs with the exact
// declaration. Approvals never overwrite; declines need reasons.
export function ReplayDecideForm({ replayId }: { replayId: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(form: HTMLFormElement, approve: boolean) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const out = (await postIntegration(`/replays/${replayId}/decide`, {
        approve,
        note: String(data.get("decide-note") ?? "") || undefined,
        idempotencyKey: crypto.randomUUID(),
      })) as { status?: string };
      setNotice(`Replay decided (${out.status ?? "unknown"}).`);
      router.refresh();
    } catch (error) {
      setErrors([
        {
          fieldId: "decide-note",
          message:
            error instanceof Error
              ? error.message
              : "We could not confirm the result. Check the replay before retrying.",
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
        <ErrorSummary title="The replay was not decided" errors={errors} />
      ) : null}
      <form
        aria-label="Decide integration replay"
        onSubmit={(e) => {
          e.preventDefault();
          const action = (
            e.nativeEvent as SubmitEvent
          ).submitter?.getAttribute("value");
          void submit(e.currentTarget, action === "approve");
        }}
      >
        <p>
          <label htmlFor="decide-note">Decision note (required to decline)</label>{" "}
          <textarea id="decide-note" name="decide-note" rows={3} maxLength={2000} />
        </p>
        <p>
          <button type="submit" name="decision" value="approve" disabled={pending}>
            {pending ? "Deciding…" : "Approve replay"}
          </button>{" "}
          <button type="submit" name="decision" value="decline" disabled={pending}>
            Decline replay
          </button>
        </p>
      </form>
    </>
  );
}
