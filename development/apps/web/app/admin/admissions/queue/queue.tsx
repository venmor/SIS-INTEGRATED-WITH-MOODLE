"use client";

import { useState } from "react";
import type { ReviewQueueItem } from "@sis/contracts";
import { Empty, ErrorSummary, Notice, Status } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import styles from "./queue.module.css";

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

function CaseRow({
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
  const status =
    item.state === "Submitted"
      ? {
          state: "Submitted — awaiting review",
          reason: "Application received.",
          action: item.actionNeeded
            ? "Clarification or correction open."
            : "No applicant action.",
        }
      : {
          state: `Application ${item.state.toLowerCase()}`,
          reason: "This case left the review pool.",
          action: "Open it for history only.",
        };

  const updatedAt = item.claimedAt ?? item.submittedAt;

  return (
    <li className={styles.caseRow}>
      <div className={styles.reference}>
        <strong>{item.reference}</strong>
        <span className={styles.meta}>
          Version {item.version}
          <br />
          {item.claimedAt ? "Claimed by you" : "Unclaimed in the pool"}
        </span>
      </div>

      <div>
        <Status
          severity={item.actionNeeded ? "attention" : "info"}
          state={status.state}
          reason={status.reason}
          updated={updatedAt ? formatLusaka(updatedAt) : undefined}
          owner={item.claimedAt ? "Admissions review" : "Admissions pool"}
          action={status.action}
        />
        <p className={styles.meta}>
          Open clarifications: {item.openClarifications} · Open corrections:{" "}
          {item.openCorrections}
        </p>
      </div>

      <div className={styles.rowActions}>
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
        </button>
        <a
          href={`/admin/admissions/case/${item.applicationId}`}
          aria-label={`Open case ${item.reference}`}
        >
          Open case
        </a>
      </div>
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
  const [stateFilter, setStateFilter] = useState("");
  const [actionNeededOnly, setActionNeededOnly] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    state: "",
    actionNeeded: false,
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = view === "mine" ? mine : pool;

  function queryString(
    scope: "mine" | "pool",
    filters = appliedFilters,
  ): string {
    const params = new URLSearchParams({ scope });
    if (scope === "pool") params.set("state", "Submitted");
    else if (filters.state) params.set("state", filters.state);
    if (filters.actionNeeded) params.set("actionNeeded", "true");
    return params.toString();
  }

  async function refresh(filters = appliedFilters) {
    setErrors([]);
    try {
      const [mineRes, poolRes] = await Promise.all([
        fetch(`/api/review/queue?${queryString("mine", filters)}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/review/queue?${queryString("pool", filters)}`, {
          credentials: "same-origin",
        }),
      ]);
      if (!mineRes.ok || !poolRes.ok) {
        throw new Error("The queue could not be refreshed.");
      }
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

  async function applyFilters(state: string, actionNeeded: boolean) {
    const next = { state, actionNeeded };
    setStateFilter(state);
    setActionNeededOnly(actionNeeded);
    setAppliedFilters(next);
    await refresh(next);
  }

  async function act(item: ReviewQueueItem, action: "claim" | "release") {
    if (pendingId) return;
    setPendingId(item.applicationId);
    setErrors([]);
    setNotice(null);
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
    <section className={styles.queue} aria-label="Admissions review queue">
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}

      {errors.length > 0 ? (
        <ErrorSummary
          title="The queue action did not complete"
          errors={errors}
        />
      ) : null}

      <div className={styles.viewBar} role="group" aria-label="Queue view">
        {(["mine", "pool"] as const).map((option) => (
          <button
            className={styles.viewButton}
            key={option}
            type="button"
            id="queue-view"
            aria-pressed={view === option}
            onClick={() => setView(option)}
          >
            {option === "mine" ? "My cases" : "Claimable pool"}
          </button>
        ))}
        <button
          className={styles.refreshButton}
          type="button"
          onClick={refresh}
        >
          Refresh queue
        </button>
      </div>

      <form
        className={styles.filterPanel}
        aria-label="Filter the queue"
        onSubmit={(event) => {
          event.preventDefault();
          void applyFilters(stateFilter, actionNeededOnly);
        }}
      >
        <div className={styles.filterField}>
          <label htmlFor="queue-state">State</label>
          <select
            className={styles.select}
            id="queue-state"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">All states</option>
            <option value="Submitted">Submitted</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
        </div>

        <label className={styles.checkLabel} htmlFor="queue-action-needed">
          <input
            id="queue-action-needed"
            type="checkbox"
            checked={actionNeededOnly}
            onChange={(event) => setActionNeededOnly(event.target.checked)}
          />
          Only cases needing action
        </label>

        <div className={styles.filterActions}>
          <button type="submit">Apply filters</button>
          <button
            type="button"
            onClick={() => void applyFilters("", false)}
          >
            Clear filters
          </button>
        </div>
      </form>

      {appliedFilters.state || appliedFilters.actionNeeded ? (
        <div
          className={styles.activeFilters}
          role="region"
          aria-label="Active filters"
        >
          <span className={styles.filterLabel}>Filters</span>
          {appliedFilters.state ? (
            <button
              type="button"
              className={styles.filterChip}
              onClick={() =>
                void applyFilters("", appliedFilters.actionNeeded)
              }
            >
              State: {appliedFilters.state} <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {appliedFilters.actionNeeded ? (
            <button
              type="button"
              className={styles.filterChip}
              onClick={() => void applyFilters(appliedFilters.state, false)}
            >
              Action needed <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <p className={styles.summary} role="status">
        {rows.length} {view === "mine" ? "assigned" : "claimable"} case
        {rows.length === 1 ? "" : "s"}
        {hasMore ? " · More available" : ""}
      </p>

      {rows.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title={view === "mine" ? "No claimed cases" : "Pool is empty"}
          message={
            view === "mine"
              ? "Claim a case from the pool."
              : "No submitted cases."
          }
        />
      ) : (
        <ul className={styles.list}>
          {rows.map((item) => (
            <CaseRow
              key={item.applicationId}
              item={item}
              action={view === "mine" ? "release" : "claim"}
              onAction={(caseItem) =>
                act(caseItem, view === "mine" ? "release" : "claim")
              }
              pending={pendingId === item.applicationId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
