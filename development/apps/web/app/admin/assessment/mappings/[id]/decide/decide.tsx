"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

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

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// UI-DECISION-001 mapping activation logic: the signatory confirms the
// frozen TESTED version with the exact declaration. Fresh idempotency
// key per attempt; four-eyes refusal stays visible.
export function MappingDecideForm({ mappingId }: { mappingId: string }) {
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
      if (data.get("mapping-declaration") !== "confirmed")
        throw new Error(
          "Confirm the declaration before activating this mapping.",
        );
      const out = (await postAssessment(`/mappings/${mappingId}/activate`, {
        idempotencyKey: crypto.randomUUID(),
      })) as { status?: string };
      setNotice(
        `Mapping activated (${out.status ?? "ACTIVE"}). A second officer decided; the creator cannot self-activate.`,
      );
      router.refresh();
    } catch (error) {
      setErrors([
        {
          fieldId: "mapping-declaration",
          message: failure(error),
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
        <ErrorSummary title="The mapping was not activated" errors={errors} />
      ) : null}
      <form
        aria-label="Activate grade mapping"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="mapping-declaration">
            <input
              id="mapping-declaration"
              name="mapping-declaration"
              type="checkbox"
              value="confirmed"
              required
            />{" "}
            I confirm that I have reviewed the stated evidence and make this
            decision within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Activating…" : "Activate mapping"}
          </button>
        </p>
      </form>
    </>
  );
}
