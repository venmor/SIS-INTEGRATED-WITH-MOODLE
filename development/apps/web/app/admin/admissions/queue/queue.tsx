"use client";

import { useState } from "react";
import type { ReviewQueueItem } from "@sis/contracts";
import { Empty, ErrorSummary, Notice } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import styles from "../../../page.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postReview(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/review${path}`, {
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
        "The review service could not complete this request.",
    );
    (error as { status?: number }).status = res.status;
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

function CaseCard({
  item,
  action,
  onAction,
  pending,
}: {
  item: ReviewQueueItem;
  action: "claim" | "release";
  onAction: (item: ReviewQueueItem) => void;
  pending: boolean;
}) {
  return (
    <li>
      <p>
        <strong>{item.reference}</strong> — {item.state}
        {item.actionNeeded ? " · Action needed" : ""}
      </p>
      <p className={styles.supporting}>
        Submitted{" "}
        {item.submittedAt ? formatLusaka(item.submittedAt) : "date unavailable"}
        {item.claimedAt ? ` · Claimed ${formatLusaka(item.claimedAt)}` : ""} ·
        Version {item.version}
      </p>
      <p className={styles.supporting}>
        Open clarifications: {item.openClarifications} · Open corrections:{" "}
        {item.openCorrections}
      </p>
      <p>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction(item)}
          aria-label={`${action === "claim" ? "Claim" : "Release"} case ${item.reference}`}
        >
          {pending
            ? "Working…"
            : action === "claim"
              ? "Claim case"
              : "Release case"}
        </button>{" "}
        <a
          href={`/admin/admissions/case/${item.applicationId}`}
          aria-label={`Open case ${item.reference}`}
        >
          Open case
        </a>
      </p>
    </li>
  );
}

export function AdmissionsQueue({
  initialMine,
  initialPool,
}: {
  initialMine: ReviewQueueItem[];
  initialPool: ReviewQueueItem[];
}) {
  const [view, setView] = useState<"mine" | "pool">("mine");
  const [mine, setMine] = useState(initialMine);
  const [pool, setPool] = useState(initialPool);
  const [hasMore, setHasMore] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = view === "mine" ? mine : pool;

  async function refresh() {
    setErrors([]);
    try {
      const [mineRes, poolRes] = await Promise.all([
        fetch(`/api/review/queue?scope=mine`, { credentials: "same-origin" }),
        fetch(`/api/review/queue?scope=pool&state=Submitted`, {
          credentials: "same-origin",
        }),
      ]);
      if (!mineRes.ok || !poolRes.ok)
        throw new Error("The queue could not be refreshed.");
      const mineData = (await mineRes.json()) as {
        items: ReviewQueueItem[];
        hasMore: boolean;
      };
      const poolData = (await poolRes.json()) as {
        items: ReviewQueueItem[];
        hasMore: boolean;
      };
      setMine(mineData.items);
      setPool(poolData.items);
      setHasMore(
        (view === "mine" ? mineData.hasMore : poolData.hasMore) ?? false,
      );
    } catch (error) {
      setErrors([{ fieldId: "queue-view", message: errorText(error) }]);
    }
  }

  async function act(item: ReviewQueueItem, action: "claim" | "release") {
    if (pendingId) return;
    setPendingId(item.applicationId);
    setErrors([]);
    setNotice(null);
    // Fresh key per attempt: reusing a key across different items or after
    // a failure would surface IDEMPOTENCY_CONFLICT instead of acting.
    const attemptKey = crypto.randomUUID();
    try {
      await postReview(`/${item.applicationId}/${action}`, {
        version: item.version,
        idempotencyKey: attemptKey,
      });
      setNotice(
        action === "claim"
          ? `Case ${item.reference} claimed.`
          : `Case ${item.reference} released to the pool.`,
      );
      await refresh();
    } catch (error) {
      setErrors([{ fieldId: "queue-view", message: errorText(error) }]);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-label="Admissions review queue">
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The queue action did not complete" errors={errors} />
      ) : null}
      <div className={styles.actions} role="group" aria-label="Queue view">
        {(["mine", "pool"] as const).map((option) => (
          <button
            key={option}
            type="button"
            id="queue-view"
            aria-pressed={view === option}
            onClick={() => {
              setView(option);
            }}
          >
            {option === "mine" ? "My cases" : "Claimable pool"}
          </button>
        ))}
        <button type="button" onClick={refresh}>
          Refresh queue
        </button>
      </div>
      <p className={styles.supporting} role="status">
        Showing {rows.length} {view === "mine" ? "claimed case" : "claimable case"}
        {rows.length === 1 ? "" : "s"}
        {hasMore ? " (more available — claim or release to narrow the list)" : ""}.
      </p>
      {rows.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title={view === "mine" ? "No claimed cases" : "Pool is empty"}
          message={
            view === "mine"
              ? "Claim a submitted case from the pool to begin reviewing."
              : "No submitted applications are waiting for review."
          }
        />
      ) : (
        <ul>
          {rows.map((item) => (
            <CaseCard
              key={item.applicationId}
              item={item}
              action={view === "mine" ? "release" : "claim"}
              onAction={(it) => act(it, view === "mine" ? "release" : "claim")}
              pending={pendingId === item.applicationId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
