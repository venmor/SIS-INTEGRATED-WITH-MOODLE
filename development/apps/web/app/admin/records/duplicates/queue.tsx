"use client";

import { useState } from "react";
import type { IdentityCandidateView } from "@sis/contracts";
import { Empty, ErrorSummary, Notice } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import styles from "../../../page.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postRecords(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/records${path}`, {
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
        "The records service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the queue state before retrying.";
}

export function DuplicateQueue({
  initial,
}: {
  initial: IdentityCandidateView[];
}) {
  const [items, setItems] =
    useState<IdentityCandidateView[]>(initial);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/records/duplicates`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("The queue could not be refreshed.");
      const data = (await res.json()) as {
        items: IdentityCandidateView[];
      };
      setItems(data.items);
    } catch (error) {
      setErrors([{ fieldId: "duplicate-queue", message: errorText(error) }]);
    }
  }

  async function resolve(
    candidateId: string,
    decision: "LINK_EXISTING" | "KEEP_SEPARATE",
    form: HTMLFormElement,
  ) {
    if (pending) return;
    setPending(candidateId + decision);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      await postRecords(`/duplicates/${candidateId}/resolve`, {
        decision,
        reason: String(data.get(`reason-${candidateId}`) ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(
        decision === "LINK_EXISTING"
          ? "Records linked. Conversion will use the surviving person."
          : "Records kept separate. Conversion may proceed.",
      );
      await refresh();
    } catch (error) {
      setErrors([{ fieldId: "duplicate-queue", message: errorText(error) }]);
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label="Identity review queue">
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The review action did not complete" errors={errors} />
      ) : null}
      {items.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title="No pending matches"
          message="Possible duplicates awaiting review appear here."
        />
      ) : (
        <ul>
          {items.map((candidate) => (
            <li key={candidate.id}>
              <p>
                <strong>Possible duplicate</strong> — {candidate.reason}
              </p>
              <p className={styles.supporting}>
                Flagged {formatLusaka(candidate.createdAt)}
              </p>
              <form
                aria-label={`Resolve identity match ${candidate.id}`}
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <p>
                  <label htmlFor={`reason-${candidate.id}`}>
                    Evidence for this decision
                  </label>{" "}
                  <input
                    id={`reason-${candidate.id}`}
                    name={`reason-${candidate.id}`}
                    type="text"
                    maxLength={2000}
                    required
                  />
                </p>
                <p>
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form");
                      if (form)
                        void resolve(
                          candidate.id,
                          "LINK_EXISTING",
                          form as HTMLFormElement,
                        );
                    }}
                  >
                    {pending === candidate.id + "LINK_EXISTING"
                      ? "Working…"
                      : "Link to existing person"}
                  </button>{" "}
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form");
                      if (form)
                        void resolve(
                          candidate.id,
                          "KEEP_SEPARATE",
                          form as HTMLFormElement,
                        );
                    }}
                  >
                    {pending === candidate.id + "KEEP_SEPARATE"
                      ? "Working…"
                      : "Keep separate"}
                  </button>
                </p>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
