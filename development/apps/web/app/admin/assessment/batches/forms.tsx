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
    const detail = (error as {
      detail?: { supportReference?: string; code?: string };
    }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Lecturer staging form: one ACTIVE mapping plus a source revision plus up
// to three mark lines (student reference + raw mark). Every submit carries
// a fresh idempotency key; the same mapping+revision replays the stored
// batch instead of creating a second snapshot.
export function BatchForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function stage(form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const lines = [1, 2, 3]
        .map((n) => ({
          studentRef: String(data.get(`batch-line-${n}-ref`) ?? "").trim(),
          rawValue: data.get(`batch-line-${n}-mark`)
            ? Number(data.get(`batch-line-${n}-mark`))
            : undefined,
        }))
        .filter((l) => l.studentRef.length > 0);
      const out = (await postAssessment("/batches", {
        mappingId: String(data.get("batch-mapping") ?? ""),
        sourceRevision: String(data.get("batch-revision") ?? ""),
        lines,
        idempotencyKey: crypto.randomUUID(),
      })) as { lines?: Array<{ flagCode?: string | null }> };
      const flagged = (out.lines ?? []).filter((l) => l.flagCode).length;
      setNotice(
        `Batch staged (${(out.lines ?? []).length} lines, ${flagged} flagged). Quarantined lines stay evidence; they never become official.`,
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "batch-mapping", message: failure(error) }]);
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
        <ErrorSummary title="The batch was not staged" errors={errors} />
      ) : null}
      <h2>Stage batch</h2>
      <form
        aria-label="Stage grade batch"
        onSubmit={(e) => {
          e.preventDefault();
          void stage(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="batch-mapping">Mapping ID</label>{" "}
          <input id="batch-mapping" name="batch-mapping" type="text" required />
        </p>
        <p>
          <label htmlFor="batch-revision">Source revision</label>{" "}
          <input
            id="batch-revision"
            name="batch-revision"
            type="text"
            maxLength={128}
            required
          />
        </p>
        {[1, 2, 3].map((n) => (
          <fieldset key={n}>
            <legend>Line {n}</legend>
            <p>
              <label htmlFor={`batch-line-${n}-ref`}>
                Student reference {n}
              </label>{" "}
              <input
                id={`batch-line-${n}-ref`}
                name={`batch-line-${n}-ref`}
                type="text"
                maxLength={64}
              />
            </p>
            <p>
              <label htmlFor={`batch-line-${n}-mark`}>Raw mark {n}</label>{" "}
              <input
                id={`batch-line-${n}-mark`}
                name={`batch-line-${n}-mark`}
                type="number"
                min={0}
              />
            </p>
          </fieldset>
        ))}
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Staging…" : "Stage batch"}
          </button>
        </p>
      </form>
    </>
  );
}

// Examinations validation trigger: runs validation for one staged batch
// and writes immutable findings. Replays carry a fresh key and converge
// on the stored result instead of duplicating findings.
export function ValidateBatchButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The batch was not validated" errors={errors} />
      ) : null}
      <p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (pending) return;
            setPending(true);
            setErrors([]);
            setNotice(null);
            postAssessment(`/batches/${batchId}/validate`, {
              idempotencyKey: crypto.randomUUID(),
            })
              .then((out) => {
                const findings = (out as { findings?: unknown[] }).findings ?? [];
                const state = (out as { resultState?: string | null }).resultState;
                setNotice(
                  `Validation complete (${findings.length} findings${state ? `, result ${state}` : ""}). Lines unchanged.`,
                );
                router.refresh();
              })
              .catch((error: unknown) => {
                setErrors([
                  { fieldId: "validate-batch", message: failure(error) },
                ]);
              })
              .finally(() => {
                setPending(false);
              });
          }}
        >
          {pending ? "Validating…" : "Run validation"}
        </button>
      </p>
    </>
  );
}
