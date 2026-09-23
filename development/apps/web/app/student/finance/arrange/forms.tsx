"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

// Student arrangement request: terms plus reason. Submission creates a
// review case; it never clears anything by itself.
export function ArrangementForm() {
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
      await fetch(`/api/finance/arrangements`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          terms: String(data.get("arrange-terms") ?? ""),
          reason: String(data.get("arrange-reason") ?? ""),
          idempotencyKey: crypto.randomUUID(),
        }),
        credentials: "same-origin",
        cache: "no-store",
      }).then(async (res) => {
        const out = (await res.json().catch(() => ({}))) as {
          message?: string;
          supportReference?: string;
        };
        if (!res.ok)
          throw new Error(
            `${out.message ?? "The request was not recorded."}${out.supportReference ? ` Support reference: ${out.supportReference}.` : ""}`,
          );
      });
      setNotice(
        "Arrangement requested. Finance will decide it; nothing is cleared until an authorized arrangement is approved.",
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([
        {
          fieldId: "arrange-terms",
          message:
            error instanceof Error
              ? error.message
              : "We could not confirm the result. Check the current state before retrying.",
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
        <ErrorSummary title="The request was not recorded" errors={errors} />
      ) : null}
      <form
        aria-label="Request payment arrangement"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="arrange-terms">Proposed terms</label>{" "}
          <textarea
            id="arrange-terms"
            name="arrange-terms"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <label htmlFor="arrange-reason">Reason</label>{" "}
          <textarea
            id="arrange-reason"
            name="arrange-reason"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Requesting…" : "Request arrangement"}
          </button>
        </p>
      </form>
    </>
  );
}
