"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";
import styles from "../workspace.module.css";

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
    const detail = (
      error as {
        detail?: { supportReference?: string; code?: string };
      }
    ).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Lecturer staging form: one ACTIVE mapping plus a source revision plus up
// to three mark lines (student reference + raw mark). Every submit carries
// a fresh idempotency key; the same mapping+revision replays the stored
// batch instead of creating a second snapshot.
export function BatchForms({ canStage = false }: { canStage?: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function stage(form: HTMLFormElement) {
    if (pending || !canStage) return;
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
      form.reset();
      setNotice(
        `Batch staged (${(out.lines ?? []).length} lines, ${flagged} flagged). Quarantined lines stay evidence; they never become official.`,
      );
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "batch-mapping", message: failure(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="stage-batch-heading">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="stage-batch-heading">Stage batch</h2>
          <p>
            Create a staging batch for an active grade mapping and source
            revision, with up to three student entries.
          </p>
        </div>
      </div>
      {notice ? (
        <Notice severity="success" title="Batch staged" message={notice} />
      ) : null}
      {errors.length ? (
        <ErrorSummary title="The batch was not staged" errors={errors} />
      ) : null}
      {!canStage ? (
        <p className={styles.permissionHint}>
          Switch to an appointed lecturer workspace to stage marks.
        </p>
      ) : null}
      <form
        aria-label="Stage grade batch"
        aria-busy={pending}
        onReset={() => {
          setErrors([]);
          setNotice(null);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          void stage(e.currentTarget);
        }}
      >
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="batch-mapping">
              Mapping ID <span aria-hidden="true">*</span>
            </label>
            <input
              id="batch-mapping"
              name="batch-mapping"
              required
              placeholder="Active mapping reference"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="batch-revision">
              Source revision <span aria-hidden="true">*</span>
            </label>
            <input
              id="batch-revision"
              name="batch-revision"
              required
              maxLength={128}
              placeholder="e.g. REV-001"
            />
          </div>
        </div>
        <fieldset className={styles.components}>
          <legend>Student entries (up to 3)</legend>
          <div
            className={`${styles.componentHead} ${styles.markGrid}`}
            aria-hidden="true"
          >
            <span>#</span>
            <span>Student reference</span>
            <span>Raw mark</span>
          </div>
          {[1, 2, 3].map((n) => (
            <div
              className={`${styles.componentRow} ${styles.markGrid}`}
              key={n}
            >
              <span className={styles.rowNumber} aria-hidden="true">
                {n}
              </span>
              <div className={styles.field}>
                <label
                  className={styles.rowLabel}
                  htmlFor={`batch-line-${n}-ref`}
                >
                  Student reference {n}
                </label>
                <input
                  id={`batch-line-${n}-ref`}
                  name={`batch-line-${n}-ref`}
                  maxLength={64}
                  placeholder="e.g. S1234567"
                />
              </div>
              <div className={styles.field}>
                <label
                  className={styles.rowLabel}
                  htmlFor={`batch-line-${n}-mark`}
                >
                  Raw mark {n}
                </label>
                <input
                  id={`batch-line-${n}-mark`}
                  name={`batch-line-${n}-mark`}
                  type="number"
                  min={0}
                  placeholder="e.g. 75"
                />
              </div>
            </div>
          ))}
        </fieldset>
        <div className={styles.actions}>
          <button type="submit" disabled={pending || !canStage}>
            {pending ? "Staging…" : "Stage batch"}
          </button>
          <button
            className={styles.secondary}
            type="reset"
            disabled={pending || !canStage}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}

// Moderation submission: sends a validated batch for moderation with the
// exact declaration. The checklist (validated, no open findings,
// reconciled candidate list) is enforced server-side; replays converge
// on the stored case.
export function SubmitBatchButton({ batchId }: { batchId: string }) {
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
        <ErrorSummary title="The batch was not submitted" errors={errors} />
      ) : null}
      <form
        aria-label="Submit batch for moderation"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          const confirmed = data.get("submit-batch-confirm");
          if (!confirmed) {
            setErrors([
              {
                fieldId: "submit-batch-confirm",
                message:
                  "Confirm that you have reviewed the stated evidence before submitting.",
              },
            ]);
            setPending(false);
            return;
          }
          postAssessment(`/batches/${batchId}/submit`, {
            declaration:
              "I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.",
            idempotencyKey: crypto.randomUUID(),
          })
            .then(() => {
              setNotice(
                "Batch submitted for moderation. The batch version is locked; corrections stage a new revision.",
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                { fieldId: "submit-batch-confirm", message: failure(error) },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <input
            id="submit-batch-confirm"
            name="submit-batch-confirm"
            type="checkbox"
            value="yes"
          />{" "}
          <label htmlFor="submit-batch-confirm">
            I confirm that I have reviewed the stated evidence and make this
            submission within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit for moderation"}
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
                const findings =
                  (out as { findings?: unknown[] }).findings ?? [];
                const state = (out as { resultState?: string | null })
                  .resultState;
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
