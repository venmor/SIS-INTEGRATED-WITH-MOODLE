"use client";

import { useState } from "react";
import type { ReviewQueueItem } from "@sis/contracts";
import { DataTable, Empty, ErrorSummary, Notice, StatusChip } from "@sis/ui";
import type { DataColumn } from "@sis/ui";
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

type QueueScope = "mine" | "pool";
type QueueSort = "oldest" | "newest";
type QueueFilters = {
  state: string;
  actionNeeded: boolean;
  reference: string;
  sort: QueueSort;
};
type QueueResponse = {
  items: ReviewQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
type PreparationItem =
  | { applicationId: string; state: "UNAVAILABLE" | "CHANGED" }
  | {
      applicationId: string;
      state: "CURRENT";
      reference: string;
      version: number;
      documents: {
        current: number;
        awaitingQualityCheck: number;
        securityScanPending: number;
      };
      openClarifications: number;
      openCorrections: number;
    };
type PreparationResponse = { items: PreparationItem[]; generatedAt: string };

export function AdmissionsQueue({
  initialItems,
  initialScope,
  initialState,
  initialActionNeeded,
  initialReference,
  initialSort,
  initialCursor,
  initialNextCursor,
  initialHasMore,
  take,
}: {
  initialItems: ReviewQueueItem[];
  initialScope: QueueScope;
  initialState: string;
  initialActionNeeded: boolean;
  initialReference: string;
  initialSort: QueueSort;
  initialCursor: string | null;
  initialNextCursor: string | null;
  initialHasMore: boolean;
  take: number;
}) {
  const [view, setView] = useState<QueueScope>(initialScope);
  const [rows, setRows] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [requestCursor, setRequestCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [stateFilter, setStateFilter] = useState(initialState);
  const [actionNeededOnly, setActionNeededOnly] = useState(initialActionNeeded);
  const [referenceInput, setReferenceInput] = useState(initialReference);
  const [sortInput, setSortInput] = useState<QueueSort>(initialSort);
  const [appliedFilters, setAppliedFilters] = useState<QueueFilters>({
    state: initialState,
    actionNeeded: initialActionNeeded,
    reference: initialReference,
    sort: initialSort,
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [restartRequired, setRestartRequired] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [errorTitle, setErrorTitle] = useState(
    "The queue could not be refreshed",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [preparation, setPreparation] = useState<PreparationResponse | null>(
    null,
  );
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  function queryString(
    scope: QueueScope,
    filters: QueueFilters,
    cursor: string | null,
  ): string {
    const params = new URLSearchParams({ scope });
    if (scope === "pool") params.set("state", "Submitted");
    else if (filters.state) params.set("state", filters.state);
    if (filters.actionNeeded) params.set("actionNeeded", "true");
    if (filters.reference) params.set("reference", filters.reference);
    if (filters.sort === "newest") params.set("sort", filters.sort);
    if (take !== 50) params.set("take", String(take));
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }

  function updateAddress(
    scope: QueueScope,
    filters: QueueFilters,
    cursor: string | null,
    historyMode: "push" | "replace" | "none",
  ) {
    if (historyMode === "none") return;
    const query = queryString(scope, filters, cursor);
    const url = `${window.location.pathname}?${query}`;
    if (historyMode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  async function loadPage(
    scope: QueueScope,
    filters: QueueFilters,
    cursor: string | null,
    historyMode: "push" | "replace" | "none" = "none",
  ): Promise<boolean> {
    setIsLoading(true);
    setErrors([]);
    setRestartRequired(false);
    try {
      const response = await fetch(
        `/api/review/queue?${queryString(scope, filters, cursor)}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as
        QueueResponse | { code?: string; message?: string };
      if (!response.ok) {
        const error = new Error(
          "message" in data && data.message
            ? data.message
            : "The queue could not be refreshed.",
        );
        (error as Error & { status?: number }).status = response.status;
        if (cursor && "code" in data && data.code === "QUEUE_CURSOR_INVALID")
          setRestartRequired(true);
        throw error;
      }
      const page = data as QueueResponse;
      setView(scope);
      setRows(page.items);
      setRequestCursor(cursor);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setStale(false);
      setSelected({});
      setPreparation(null);
      setPreparationError(null);
      updateAddress(scope, filters, cursor, historyMode);
      return true;
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        setRows([]);
        setNextCursor(null);
        setHasMore(false);
        setRequestCursor(null);
        setCursorHistory([]);
        setNotice(null);
        setStale(false);
        setSelected({});
        setPreparation(null);
        setPreparationError(null);
        setErrorTitle("Admissions queue access changed");
        setErrors([
          {
            fieldId: "queue-view",
            message:
              "The queue was cleared because this workspace can no longer load it. Switch to an authorized workspace or ask an administrator.",
          },
        ]);
        return false;
      }
      setStale(true);
      setPreparation(null);
      setErrorTitle("The queue could not be refreshed");
      setErrors([
        {
          fieldId: "queue-view",
          message: `${errorText(error)} Previously loaded cases may be out of date. Refresh the queue before claiming or releasing a case.`,
        },
      ]);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function refresh() {
    if (isPreparing) return;
    await loadPage(view, appliedFilters, requestCursor);
  }

  async function applyFilters(
    state: string,
    actionNeeded: boolean,
    reference: string,
    sort: QueueSort,
  ) {
    if (isPreparing) return;
    const next = {
      state: view === "pool" ? "Submitted" : state,
      actionNeeded,
      reference: reference.trim(),
      sort,
    };
    setStateFilter(next.state);
    setActionNeededOnly(actionNeeded);
    setReferenceInput(next.reference);
    setSortInput(sort);
    setCursorHistory([]);
    if (await loadPage(view, next, null, "replace")) setAppliedFilters(next);
  }

  async function changeView(scope: QueueScope) {
    if (isPreparing) return;
    setCursorHistory([]);
    const filters =
      scope === "pool"
        ? { ...appliedFilters, state: "Submitted" }
        : appliedFilters;
    if (scope === "pool") {
      setStateFilter("Submitted");
      setAppliedFilters(filters);
    }
    await loadPage(scope, filters, null, "replace");
  }

  async function goNext() {
    if (!hasMore || !nextCursor || isLoading || isPreparing) return;
    const previous = requestCursor;
    if (await loadPage(view, appliedFilters, nextCursor, "push"))
      setCursorHistory((history) => [...history, previous]);
  }

  async function goPrevious() {
    if (!cursorHistory.length || isLoading || isPreparing) return;
    const previous = cursorHistory[cursorHistory.length - 1];
    if (await loadPage(view, appliedFilters, previous, "replace"))
      setCursorHistory((history) => history.slice(0, -1));
  }

  async function act(item: ReviewQueueItem, action: "claim" | "release") {
    if (pendingId || isPreparing) return;
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
      await loadPage(view, appliedFilters, requestCursor);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        setRows([]);
        setNextCursor(null);
        setHasMore(false);
        setNotice(null);
        setStale(false);
        setErrorTitle("Admissions queue access changed");
        setErrors([
          {
            fieldId: "queue-view",
            message:
              "The queue was cleared because this workspace can no longer use it. Switch to an authorized workspace or ask an administrator.",
          },
        ]);
        return;
      }
      setStale(true);
      setErrorTitle("The case action could not be confirmed");
      setErrors([{ fieldId: "queue-view", message: errorText(error) }]);
    } finally {
      setPendingId(null);
    }
  }

  async function previewSelection() {
    const items = Object.entries(selected).map(([applicationId, version]) => ({
      applicationId,
      version,
    }));
    if (
      view !== "mine" ||
      stale ||
      isLoading ||
      isPreparing ||
      items.length === 0 ||
      items.length > 50
    )
      return;
    setIsPreparing(true);
    setPreparation(null);
    setPreparationError(null);
    try {
      const result = (await postReview("/queue/preparation", {
        items,
      })) as PreparationResponse;
      setPreparation(result);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        setRows([]);
        setSelected({});
        setPreparation(null);
        setNextCursor(null);
        setHasMore(false);
        setRequestCursor(null);
        setCursorHistory([]);
        setStale(false);
        setErrorTitle("Admissions queue access changed");
        setErrors([
          {
            fieldId: "queue-view",
            message:
              "This workspace can no longer prepare these cases. Switch to an authorized workspace or ask an administrator.",
          },
        ]);
      } else {
        setPreparationError(
          `${errorText(error)} No case was changed. Refresh the queue before retrying if a claim or version may have changed.`,
        );
      }
    } finally {
      setIsPreparing(false);
    }
  }

  const filtersChanged =
    stateFilter !== appliedFilters.state ||
    actionNeededOnly !== appliedFilters.actionNeeded ||
    referenceInput.trim() !== appliedFilters.reference ||
    sortInput !== appliedFilters.sort;
  const hasUserFilters =
    (view === "mine" && !!appliedFilters.state) ||
    appliedFilters.actionNeeded ||
    !!appliedFilters.reference;
  const selectedCount = Object.keys(selected).length;
  const columns: DataColumn<ReviewQueueItem>[] = [
    ...(view === "mine"
      ? [
          {
            heading: "Prepare",
            render: (item: ReviewQueueItem) => (
              <input
                className={styles.selectionBox}
                type="checkbox"
                aria-label={`Select case ${item.reference} for preparation`}
                checked={selected[item.applicationId] !== undefined}
                disabled={
                  isLoading ||
                  stale ||
                  isPreparing ||
                  (selectedCount >= 50 &&
                    selected[item.applicationId] === undefined)
                }
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((previous) => {
                    const next = { ...previous };
                    if (checked) next[item.applicationId] = item.version;
                    else delete next[item.applicationId];
                    return next;
                  });
                  setPreparation(null);
                  setPreparationError(null);
                }}
              />
            ),
          },
        ]
      : []),
    {
      heading: "Case",
      render: (item) => (
        <span className="grid gap-1">
          <strong className="break-all font-mono text-sm text-sis-text">
            {item.reference}
          </strong>
          <span className="text-sm text-sis-muted">Version {item.version}</span>
        </span>
      ),
    },
    {
      heading: "Status",
      render: (item) => (
        <span className="grid gap-1.5">
          <span>
            <StatusChip tone={item.actionNeeded ? "attention" : "info"}>
              {item.state === "Submitted"
                ? "Submitted for review"
                : `Application ${item.state.toLowerCase()}`}
            </StatusChip>
          </span>
          <span className="text-sm text-sis-muted">
            {item.state === "Submitted"
              ? "Application received."
              : "This case left the review pool."}
          </span>
          <span className="text-sm text-sis-text">
            {item.state !== "Submitted"
              ? "Open for history."
              : item.actionNeeded
                ? "Clarification or correction open."
                : "No applicant action pending."}
          </span>
        </span>
      ),
    },
    {
      heading: "Open requests",
      render: (item) => (
        <span className="grid gap-1 text-sm text-sis-text">
          <span>Clarifications: {item.openClarifications}</span>
          <span>Corrections: {item.openCorrections}</span>
        </span>
      ),
    },
    {
      heading: "Review owner and update",
      render: (item) => {
        const updatedAt = item.claimedAt ?? item.submittedAt;
        return (
          <span className="grid gap-1 text-sm">
            <span className="font-medium text-sis-text">
              {item.claimedAt ? "Claimed by you" : "Admissions pool"}
            </span>
            <span className="text-sis-muted">
              {updatedAt ? formatLusaka(updatedAt) : "Update time unavailable"}
            </span>
          </span>
        );
      },
    },
    {
      heading: "Actions",
      render: (item) => {
        const action = view === "mine" ? "release" : "claim";
        const pending =
          pendingId === item.applicationId || isLoading || isPreparing;
        return (
          <span className={styles.rowActions}>
            <button
              type="button"
              disabled={pending || stale}
              onClick={() => void act(item, action)}
              aria-label={`${action === "claim" ? "Claim" : "Release"} case ${item.reference}`}
            >
              {pendingId === item.applicationId
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
          </span>
        );
      },
    },
  ];

  return (
    <section
      className={styles.queue}
      aria-label="Admissions review queue"
      aria-busy={isLoading}
    >
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}

      {errors.length > 0 ? (
        <ErrorSummary title={errorTitle} errors={errors} />
      ) : null}
      {restartRequired ? (
        <button
          type="button"
          onClick={() => {
            setCursorHistory([]);
            void loadPage(view, appliedFilters, null, "replace");
          }}
        >
          Restart from first page
        </button>
      ) : null}

      <div className={styles.viewBar} role="group" aria-label="Queue view">
        {(["mine", "pool"] as const).map((option) => (
          <button
            className={styles.viewButton}
            key={option}
            type="button"
            aria-pressed={view === option}
            disabled={isLoading || isPreparing}
            onClick={() => void changeView(option)}
          >
            {option === "mine" ? "My cases" : "Claimable pool"}
          </button>
        ))}
        <button
          className={styles.refreshButton}
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading || isPreparing}
        >
          {isLoading ? "Refreshing…" : "Refresh queue"}
        </button>
      </div>

      <p className="text-sm text-sis-muted">
        Viewing {view === "mine" ? "cases assigned to you" : "claimable cases"}
        {view === "pool" ? " · Submitted cases only" : ""}. Search and filters
        stay within your active admissions scope.
      </p>

      <form
        className={styles.filterPanel}
        aria-label="Filter the queue"
        onSubmit={(event) => {
          event.preventDefault();
          void applyFilters(
            stateFilter,
            actionNeededOnly,
            referenceInput,
            sortInput,
          );
        }}
      >
        <div className={styles.filterField}>
          <label htmlFor="queue-state">State</label>
          <select
            className={styles.select}
            id="queue-state"
            value={stateFilter}
            disabled={view === "pool" || isLoading || isPreparing}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">All states</option>
            <option value="Submitted">Submitted</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
        </div>

        <div className={styles.filterField}>
          <label htmlFor="queue-reference">Case reference</label>
          <input
            className={styles.select}
            id="queue-reference"
            type="search"
            maxLength={64}
            autoComplete="off"
            value={referenceInput}
            disabled={isLoading || isPreparing}
            onChange={(event) => setReferenceInput(event.target.value)}
          />
          <p className="text-xs text-sis-muted">
            Enter the full reference. Only cases in this queue can be found.
          </p>
        </div>

        <div className={styles.filterField}>
          <label htmlFor="queue-sort">Order</label>
          <select
            className={styles.select}
            id="queue-sort"
            value={sortInput}
            disabled={isLoading || isPreparing}
            onChange={(event) => setSortInput(event.target.value as QueueSort)}
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
          </select>
        </div>

        <label className={styles.checkLabel} htmlFor="queue-action-needed">
          <input
            id="queue-action-needed"
            type="checkbox"
            checked={actionNeededOnly}
            disabled={isLoading || isPreparing}
            onChange={(event) => setActionNeededOnly(event.target.checked)}
          />
          Only cases needing action
        </label>

        <div className={styles.filterActions}>
          <button type="submit" disabled={isLoading || isPreparing}>
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => void applyFilters("", false, "", "oldest")}
            disabled={isLoading || isPreparing}
          >
            Clear filters
          </button>
        </div>
      </form>

      {filtersChanged ? (
        <p className="text-sm font-medium text-sis-info-text">
          Filters changed. Select Apply filters to update the cases below.
        </p>
      ) : null}

      <div
        className={styles.activeFilters}
        role="region"
        aria-label="Active filters"
      >
        <span className={styles.filterLabel}>Filters</span>
        {!hasUserFilters ? (
          <span className={styles.summary}>No filters applied</span>
        ) : null}
        {view === "mine" && appliedFilters.state ? (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              void applyFilters(
                "",
                appliedFilters.actionNeeded,
                appliedFilters.reference,
                appliedFilters.sort,
              )
            }
          >
            State: {appliedFilters.state} <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {appliedFilters.actionNeeded ? (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              void applyFilters(
                appliedFilters.state,
                false,
                appliedFilters.reference,
                appliedFilters.sort,
              )
            }
          >
            Action needed <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {appliedFilters.reference ? (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              void applyFilters(
                appliedFilters.state,
                appliedFilters.actionNeeded,
                "",
                appliedFilters.sort,
              )
            }
          >
            Reference: {appliedFilters.reference}{" "}
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>

      <p
        id="queue-view"
        className={styles.summary}
        role="status"
        aria-live="polite"
      >
        {isLoading ? "Loading queue… " : ""}
        {rows.length} {view === "mine" ? "assigned" : "claimable"} case
        {rows.length === 1 ? "" : "s"} on this page
        {hasMore ? " · More available" : ""}
      </p>

      {view === "mine" ? (
        <section
          className={styles.preparationPanel}
          aria-label="Prepare assigned cases"
        >
          <div>
            <h2>Prepare assigned cases</h2>
            <p>
              Select up to 50 cases on this page to compare their current file
              and open-request counts.
            </p>
            <p className={styles.summary} role="status">
              {selectedCount} case{selectedCount === 1 ? "" : "s"} selected
            </p>
          </div>
          <button
            type="button"
            disabled={
              !selectedCount ||
              stale ||
              isLoading ||
              isPreparing ||
              Boolean(pendingId)
            }
            onClick={() => void previewSelection()}
          >
            {isPreparing ? "Preparing preview…" : "Preview selected cases"}
          </button>
        </section>
      ) : null}
      {preparationError ? (
        <Notice
          severity="warning"
          title="Preview unavailable"
          message={preparationError}
        />
      ) : null}
      {preparation && view === "mine" && !stale ? (
        <section
          className={styles.preparationResult}
          role="region"
          aria-label="Preparation preview"
        >
          <div className={styles.preparationHeading}>
            <h2>Preparation preview</h2>
            <p>Checked {formatLusaka(preparation.generatedAt)}</p>
          </div>
          <p>
            This is not document verification or an admissions decision. Open
            each case to compare declarations with its evidence.
          </p>
          <ol className={styles.preparationList}>
            {preparation.items.map((item, index) => (
              <li key={`${item.applicationId}-${index}`}>
                {item.state === "CURRENT" ? (
                  <>
                    <strong>{item.reference}</strong>
                    <span>
                      Current files: {item.documents.current} · Ready for
                      quality review: {item.documents.awaitingQualityCheck} ·
                      Safety check pending: {item.documents.securityScanPending}
                    </span>
                    <span>
                      Open clarifications: {item.openClarifications} · Open
                      corrections: {item.openCorrections}
                    </span>
                    <a href={`/admin/admissions/case/${item.applicationId}`}>
                      Review this case
                    </a>
                  </>
                ) : item.state === "CHANGED" ? (
                  <span>
                    Selection {index + 1} changed. Refresh the queue and review
                    its current version.
                  </span>
                ) : (
                  <span>
                    Selection {index + 1} is no longer available in your
                    assigned scope.
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {rows.length === 0 && isLoading ? (
        <p>Loading cases…</p>
      ) : rows.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title={
            appliedFilters.reference
              ? "No matching case"
              : view === "mine"
                ? "No claimed cases"
                : "Pool is empty"
          }
          message={
            appliedFilters.reference
              ? "Check the reference or clear the search. Cases outside this queue are not shown."
              : view === "mine"
                ? "Claim a case from the pool."
                : "No submitted cases."
          }
        />
      ) : (
        <div
          className={
            isLoading
              ? "opacity-60 transition-opacity motion-reduce:transition-none"
              : "transition-opacity motion-reduce:transition-none"
          }
        >
          <DataTable
            title="Admissions cases"
            description={`${rows.length} ${view === "mine" ? "assigned" : "claimable"} case${rows.length === 1 ? "" : "s"} on this page · ${appliedFilters.sort === "oldest" ? "Oldest first" : "Newest first"}`}
            columns={columns}
            rows={rows}
            keyOf={(item) => item.applicationId}
            emptyText="No cases in this view."
            wideCards
          />
        </div>
      )}

      <nav className={styles.pagination} aria-label="Queue pages">
        <button
          type="button"
          onClick={() => void goPrevious()}
          disabled={!cursorHistory.length || isLoading || isPreparing}
        >
          Previous page
        </button>
        <button
          type="button"
          onClick={() => void goNext()}
          disabled={!hasMore || !nextCursor || isLoading || isPreparing}
        >
          {isLoading ? "Loading…" : "Next page"}
        </button>
      </nav>
    </section>
  );
}
