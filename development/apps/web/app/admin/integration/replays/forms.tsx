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

// Replay request: frozen evidence, reason and declaration. A second
// officer decides on the decision page; requesters never self-decide.
export function ReplayRequestForm() {
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
      await postIntegration("/replays", {
        attemptId: String(data.get("replay-attempt") ?? "") || undefined,
        reason: String(data.get("replay-reason") ?? ""),
        declaration: data.get("replay-declaration") === "on",
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(
        "Replay requested with frozen evidence. A second officer must decide it.",
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "replay-attempt", message: failure(error) }]);
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
        <ErrorSummary title="The replay was not requested" errors={errors} />
      ) : null}
      <form
        aria-label="Request integration replay"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="replay-attempt">Dead-letter attempt ID</label>{" "}
          <input id="replay-attempt" name="replay-attempt" type="text" />
        </p>
        <p>
          <label htmlFor="replay-reason">Why is this replay safe?</label>{" "}
          <textarea
            id="replay-reason"
            name="replay-reason"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <label htmlFor="replay-declaration">
            <input
              id="replay-declaration"
              name="replay-declaration"
              type="checkbox"
              value="on"
            />{" "}
            I confirm that I have reviewed the stated evidence and make this
            request within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Requesting…" : "Request replay"}
          </button>
        </p>
      </form>
    </>
  );
}
