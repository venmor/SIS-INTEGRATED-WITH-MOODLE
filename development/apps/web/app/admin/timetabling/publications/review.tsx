"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DemoTimetablePublicationCommand,
  DemoTimetablePublicationReceipt,
  DemoTimetablePublicationReview,
} from "@sis/contracts";
import type { Catalogue, MasterDraft } from "../master/planner";
import { formatLusaka } from "../../../../lib/time";
import styles from "./review.module.css";

type Decision = DemoTimetablePublicationReceipt & {
  contentDigest: string;
  commandDigest: string;
  reason: string;
  previousPublicationId: string | null;
  clientRequestId: string | null;
  ownDecision: boolean;
};
type Report = Omit<
  DemoTimetablePublicationReview,
  "latestPublication" | "publications"
> & {
  latestPublication: Decision | null;
  publications: Decision[];
};
type Intent = Omit<DemoTimetablePublicationCommand, "password"> & {
  draftId: string;
};
const endpoint = "/api/timetabling/demo-master";
const findingLabels: Record<string, string> = {
  ROSTER_UNVERIFIED: "Check registered learners",
  COVERAGE_INCOMPLETE: "Schedule every section",
  SECTION_MEMBERSHIP_CONFLICT: "Check section membership",
  ROOM_CONFLICT: "Room double-booked",
  TEACHER_CONFLICT: "Lecturer double-booked",
  STUDENT_CONFLICT: "Student double-booked",
  SOURCE_CHANGED: "Source records changed",
  RULE_SUPERSEDED: "Select the current rule",
};

async function readReport(
  id: string,
  beforeVersion?: number,
  clientRequestId?: string,
): Promise<Report> {
  const params = new URLSearchParams();
  if (beforeVersion) params.set("beforeVersion", String(beforeVersion));
  if (clientRequestId) params.set("clientRequestId", clientRequestId);
  const response = await fetch(
    `${endpoint}/${id}/publication-review${params.size ? `?${params}` : ""}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.draft?.id !== id)
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : "Publication state could not be checked.",
    );
  return body as Report;
}

function matches(decision: Decision, command: Intent) {
  return (
    decision.ownDecision &&
    decision.clientRequestId === command.clientRequestId &&
    decision.masterDraftId === command.draftId &&
    decision.contentDigest === command.contentDigest &&
    decision.reason === command.reason &&
    decision.previousPublicationId === command.expectedPublicationId
  );
}
function receiptMessage(receipt: Decision) {
  return `Publication receipt confirmed · fictional version ${receipt.version} · ${receipt.isCurrent ? "current timetable" : "superseded; a later timetable is current"}.`;
}
type StoredIntent = {
  schema: 1;
  command: Intent;
  periodId: string;
  masterVersion: number;
};
function decodeStoredIntent(raw: string): StoredIntent {
  const saved = JSON.parse(raw) as StoredIntent;
  const command = saved?.command;
  const uuid = (value: unknown) =>
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    );
  if (
    saved?.schema !== 1 ||
    !uuid(saved.periodId) ||
    !Number.isSafeInteger(saved.masterVersion) ||
    saved.masterVersion < 1 ||
    !command ||
    !uuid(command.draftId) ||
    !uuid(command.clientRequestId) ||
    !(
      command.expectedPublicationId === null ||
      uuid(command.expectedPublicationId)
    ) ||
    !/^[a-f0-9]{64}$/i.test(command.contentDigest ?? "") ||
    command.reviewed !== true ||
    command.fictionalOnly !== true ||
    typeof command.reason !== "string" ||
    command.reason.trim().length < 10 ||
    command.reason.length > 500 ||
    Object.keys(command).some(
      (key) =>
        ![
          "draftId",
          "clientRequestId",
          "contentDigest",
          "expectedPublicationId",
          "reviewed",
          "fictionalOnly",
          "reason",
        ].includes(key),
    )
  )
    throw new Error(
      "The saved publication reference could not be restored. Keep this tab and contact support before another decision.",
    );
  return saved;
}
async function readDrafts(periodId: string, beforeVersion?: number) {
  const params = new URLSearchParams({ periodId });
  if (beforeVersion) params.set("beforeVersion", String(beforeVersion));
  const response = await fetch(`${endpoint}/draft-history?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => ({}));
  if (
    !response.ok ||
    !Array.isArray(body.items) ||
    body.items.some((draft: MasterDraft) => draft.periodId !== periodId)
  )
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : "Saved proposals could not be loaded. Your current view is preserved.",
    );
  return body as { items: MasterDraft[]; olderVersionCursor: number | null };
}

export function PublicationReview({
  initialDrafts,
  periods,
  initialPeriodId,
  initialOlderVersionCursor,
  actorRef,
}: {
  initialDrafts: MasterDraft[];
  periods: Catalogue["periods"];
  initialPeriodId: string;
  initialOlderVersionCursor: number | null;
  actorRef: string;
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [olderDraftCursor, setOlderDraftCursor] = useState(
    initialOlderVersionCursor,
  );
  const [draftPages, setDraftPages] = useState<Array<number | undefined>>([
    undefined,
  ]);
  const [draftLoading, setDraftLoading] = useState(false);
  const draftRequest = useRef(0);
  const [selectedId, setSelectedId] = useState(drafts[0]?.id ?? "");
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(Boolean(initialDrafts[0]));
  const [freshReport, setFreshReport] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const storageKey = `sis:timetable-publication:v1:${actorRef}`;
  const [pending, setPending] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [fictional, setFictional] = useState(false);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [course, setCourse] = useState("");
  const [page, setPage] = useState(1);
  const [impactPage, setImpactPage] = useState(1);
  const [historyPages, setHistoryPages] = useState<Array<number | undefined>>([
    undefined,
  ]);
  const selected = drafts.find((draft) => draft.id === selectedId);
  const request = useRef(0);
  const uncertain = useRef(false);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const sequence = ++request.current;
    readReport(selectedId)
      .then((value) => {
        if (active && sequence === request.current) {
          setReport(value);
          setFreshReport(true);
        }
      })
      .catch((cause) => {
        if (active && sequence === request.current) {
          setFreshReport(false);
          setError(
            cause instanceof Error
              ? cause.message
              : "Publication state unavailable.",
          );
        }
      })
      .finally(() => {
        if (active && sequence === request.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectionRevision]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(async () => {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) {
          const saved = decodeStoredIntent(raw);
          const result = await readDrafts(
            saved.periodId,
            saved.masterVersion + 1,
          );
          if (!result.items.some((draft) => draft.id === saved.command.draftId))
            throw new Error(
              "The saved proposal is unavailable. Keep its publication reference and check your appointment before another decision.",
            );
          if (!active) return;
          request.current += 1;
          setDrafts(result.items);
          setPeriodId(saved.periodId);
          setOlderDraftCursor(result.olderVersionCursor);
          setDraftPages([saved.masterVersion + 1]);
          setSelectedId(saved.command.draftId);
          setSelectionRevision((value) => value + 1);
          setReport(null);
          setFreshReport(false);
          setLoading(true);
          setIntent(saved.command);
          setReason(saved.command.reason);
          setReviewed(true);
          setFictional(true);
          uncertain.current = true;
          setMessage(
            "Saved publication reference restored. Check publication state before another decision.",
          );
        }
        if (active) setRecoveryReady(true);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Publication recovery is unavailable. Keep this tab before another decision.",
          );
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!intent) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank")
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (
        !window.confirm(
          "Publication status is unresolved. Keep the request reference and check publication state before leaving. Leave this page?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };
    const navigate = (event: Event) => {
      const navigation = event as Event & {
        navigationType?: string;
        canIntercept?: boolean;
      };
      if (
        navigation.navigationType === "traverse" &&
        navigation.canIntercept &&
        !window.confirm(
          "Publication status is unresolved. Leave this page before checking it?",
        )
      )
        event.preventDefault();
    };
    const navigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, [intent]);

  function choose(id: string) {
    request.current += 1;
    setSelectedId(id);
    setSelectionRevision((value) => value + 1);
    setReport(null);
    setFreshReport(false);
    setLoading(Boolean(id));
    setReviewed(false);
    setFictional(false);
    setReason("");
    setPassword("");
    setError("");
    setMessage("");
    setCourse("");
    setPage(1);
    setImpactPage(1);
    setHistoryPages([undefined]);
    uncertain.current = false;
  }
  async function loadDrafts(
    nextPeriod: string,
    beforeVersion?: number,
    pages: Array<number | undefined> = [undefined],
  ) {
    const sequence = ++draftRequest.current;
    setDraftLoading(true);
    setError("");
    try {
      const body = await readDrafts(nextPeriod, beforeVersion);
      if (sequence !== draftRequest.current) return;
      setDrafts(body.items);
      setPeriodId(nextPeriod);
      setOlderDraftCursor(body.olderVersionCursor);
      setDraftPages(pages);
      choose(body.items[0]?.id ?? "");
    } catch (cause) {
      if (sequence === draftRequest.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Saved proposals unavailable. Your current view is preserved.",
        );
    } finally {
      if (sequence === draftRequest.current) setDraftLoading(false);
    }
  }
  function clearStoredIntent() {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      /* A later reload still checks the same server receipt. */
    }
  }
  async function checkHistory(
    beforeVersion?: number,
    command = intent,
    pages: Array<number | undefined> = [undefined],
  ) {
    const sequence = ++request.current;
    setLoading(true);
    setError("");
    try {
      const next = await readReport(
        selectedId,
        beforeVersion,
        command?.clientRequestId,
      );
      if (sequence !== request.current) return;
      setReport(next);
      setFreshReport(true);
      setImpactPage(1);
      setHistoryPages(pages);
      if (!command) {
        setReviewed(false);
        setFictional(false);
        setPassword("");
      }
      const matched =
        command &&
        [
          next.requestReceipt,
          next.latestPublication,
          ...next.publications,
        ].find((item) => item && matches(item, command));
      if (matched) {
        clearStoredIntent();
        setIntent(null);
        setReviewed(false);
        setFictional(false);
        setPassword("");
        uncertain.current = false;
        setMessage(receiptMessage(matched));
      } else if (command)
        setError(
          "This publication reference is unresolved. Keep it and retry the same decision with your password.",
        );
      else setMessage("Publication state checked.");
    } catch (cause) {
      if (sequence === request.current) {
        setFreshReport(false);
        setReviewed(false);
        setFictional(false);
        setPassword("");
        setError(
          cause instanceof Error
            ? cause.message
            : "Publication state could not be checked.",
        );
      }
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report || !selected) return;
    const command = intent ?? {
      draftId: selected.id,
      clientRequestId: crypto.randomUUID(),
      contentDigest: report.draft.contentDigest,
      expectedPublicationId: report.latestPublication?.publicationId ?? null,
      reviewed: true,
      fictionalOnly: true,
      reason: reason.trim(),
    };
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          schema: 1,
          command,
          periodId: selected.periodId,
          masterVersion: selected.version,
        } satisfies StoredIntent),
      );
    } catch {
      setError(
        "This browser could not retain the publication reference. Enable tab storage before publishing. Your inputs are preserved.",
      );
      return;
    }
    setIntent(command);
    setPending(true);
    setError("");
    setMessage("");
    const { draftId, ...payload } = command;
    try {
      const response = await fetch(`${endpoint}/${draftId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, password }),
        signal: AbortSignal.timeout(25000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status >= 500) uncertain.current = true;
        else if (!uncertain.current) {
          clearStoredIntent();
          setIntent(null);
          setReviewed(false);
          setFictional(false);
        }
        setError(
          response.status >= 500
            ? "Publication status is uncertain. Check publication state or retry this reference."
            : typeof body.message === "string"
              ? body.message
              : "The decision was refused. Check the saved version and your authority.",
        );
        return;
      }
      if (
        body.status !== "FICTIONAL_PUBLISHED" ||
        !/^[a-f0-9-]{36}$/i.test(body.publicationId ?? "") ||
        !Number.isSafeInteger(body.version) ||
        body.version < 1 ||
        !Number.isFinite(Date.parse(body.publishedAt)) ||
        !matches(body as Decision, command)
      ) {
        uncertain.current = true;
        setError(
          "Publication status is uncertain. Check publication state before another decision.",
        );
        return;
      }
      clearStoredIntent();
      setIntent(null);
      uncertain.current = false;
      setMessage(receiptMessage(body as Decision));
      await checkHistory(undefined, null);
      setMessage(receiptMessage(body as Decision));
    } catch {
      uncertain.current = true;
      setError(
        "Publication status is uncertain. Check publication state or retry this reference.",
      );
    } finally {
      setPassword("");
      setPending(false);
    }
  }
  const sessions = [...(selected?.sessions ?? [])]
    .filter((session) => !course || session.courseCode === course)
    .sort(
      (a, b) =>
        Date.parse(a.startAt) - Date.parse(b.startAt) ||
        a.id.localeCompare(b.id),
    );
  const pageCount = Math.max(1, Math.ceil(sessions.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = sessions.slice((currentPage - 1) * 10, currentPage * 10);
  const changes = report?.impact.changes ?? [];
  const impactPages = Math.max(1, Math.ceil(changes.length / 10));
  const currentImpactPage = Math.min(impactPage, impactPages);
  const visibleChanges = changes.slice(
    (currentImpactPage - 1) * 10,
    currentImpactPage * 10,
  );
  const currentPublished =
    report?.latestPublication?.masterDraftId === selectedId;
  const canDecide =
    recoveryReady &&
    freshReport &&
    report?.canPublish &&
    !report.ownProposal &&
    report.currentReady &&
    !currentPublished;
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <h2>Saved master</h2>
            <p>Select an academic period, then review its saved proposals.</p>
          </div>
          <button
            type="button"
            disabled={
              !recoveryReady ||
              loading ||
              pending ||
              draftLoading ||
              !selectedId
            }
            onClick={() => void checkHistory()}
          >
            Check publication state
          </button>
        </div>
        <label className={styles.field}>
          Academic period
          <select
            value={periodId}
            disabled={
              !recoveryReady ||
              pending ||
              loading ||
              draftLoading ||
              Boolean(intent)
            }
            onChange={(event) => void loadDrafts(event.target.value)}
          >
            {periods.map((period) => (
              <option value={period.id} key={period.id}>
                {period.code}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Master proposal
          <select
            value={selectedId}
            disabled={
              !recoveryReady || pending || draftLoading || Boolean(intent)
            }
            onChange={(event) => choose(event.target.value)}
          >
            <option value="">Select proposal</option>
            {drafts.map((draft) => (
              <option value={draft.id} key={draft.id}>
                {periods.find((period) => period.id === draft.periodId)?.code ??
                  "Period"}{" "}
                · master {draft.version} ·{" "}
                {draft.status === "BLOCKED" ? "blocked" : "for review"}
              </option>
            ))}
          </select>
        </label>
        <nav className={styles.actions} aria-label="Saved proposal pages">
          <button
            type="button"
            disabled={
              !recoveryReady ||
              draftPages.length <= 1 ||
              loading ||
              pending ||
              draftLoading ||
              Boolean(intent)
            }
            onClick={() => {
              const pages = draftPages.slice(0, -1);
              void loadDrafts(periodId, pages.at(-1), pages);
            }}
          >
            Newer proposals
          </button>
          <span aria-live="polite">
            Proposal page {draftPages.length} · {drafts.length} shown
          </span>
          <button
            type="button"
            disabled={
              !recoveryReady ||
              !olderDraftCursor ||
              loading ||
              pending ||
              draftLoading ||
              Boolean(intent)
            }
            onClick={() =>
              void loadDrafts(periodId, olderDraftCursor ?? undefined, [
                ...draftPages,
                olderDraftCursor ?? undefined,
              ])
            }
          >
            Older proposals
          </button>
          <button
            type="button"
            disabled={
              !recoveryReady ||
              !periodId ||
              loading ||
              pending ||
              draftLoading ||
              Boolean(intent)
            }
            onClick={() => void loadDrafts(periodId)}
          >
            Latest proposals
          </button>
        </nav>
        {draftLoading && <p role="status">Loading saved proposals…</p>}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {intent && (
          <p className={styles.reference}>
            Unresolved publication reference:{" "}
            <code>{intent.clientRequestId}</code>. Keep this page open until
            checked.
          </p>
        )}
        {loading && <p role="status">Checking current sources…</p>}
        {!drafts.length && <p>No master proposals yet.</p>}
        {selected && (
          <>
            <p className={styles.context}>
              {selected.sessions.length} sessions · saved{" "}
              {formatLusaka(selected.createdAt)}
            </p>
            <label className={styles.field}>
              Course preview
              <select
                value={course}
                onChange={(event) => {
                  setCourse(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Full master</option>
                {[
                  ...new Set(
                    selected.sessions.map((session) => session.courseCode),
                  ),
                ]
                  .sort()
                  .map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
              </select>
            </label>
            <ul
              className={styles.sessions}
              aria-label="Saved timetable sessions"
            >
              {visible.map((session) => (
                <li key={session.id}>
                  <strong>
                    {session.courseCode} · {session.courseTitle}
                  </strong>
                  <p>
                    {formatLusaka(session.startAt)} —{" "}
                    {formatLusaka(session.endAt)}
                  </p>
                  <p>
                    {session.campusCode} · {session.venueCode} ·{" "}
                    {session.sectionCode}
                  </p>
                  <p>
                    {session.teacherName ?? "Lecturer unavailable"} ·{" "}
                    {session.deliveryMode?.replaceAll("_", " ").toLowerCase() ??
                      "Delivery unavailable"}{" "}
                    ·{" "}
                    {session.requiresStepFreeAccess
                      ? "Step-free access required"
                      : "No step-free requirement recorded"}
                  </p>
                  <small>
                    {session.registrationIds.length} linked learners ·{" "}
                    {session.plannedSeats} planned seats · session{" "}
                    {session.id.slice(0, 8)}
                  </small>
                </li>
              ))}
            </ul>
            <nav className={styles.actions} aria-label="Saved session pages">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous sessions
              </button>
              <span aria-live="polite">
                Page {currentPage} of {pageCount} · {sessions.length} sessions
              </span>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next sessions
              </button>
            </nav>
          </>
        )}
      </section>
      {report && (
        <>
          <section
            className={styles.panel}
            aria-labelledby="publication-readiness"
          >
            <h2 id="publication-readiness">Current source checks</h2>
            <p className={styles.context}>
              Master {report.draft.version} · prepared by{" "}
              {report.draft.proposerName} · checked{" "}
              {formatLusaka(report.sourceCheckedAt)}
            </p>
            <p
              className={
                freshReport && report.currentReady ? styles.ready : styles.error
              }
            >
              {!freshReport
                ? "Source checks unavailable · check again before approval"
                : report.currentReady
                  ? "Ready for independent review"
                  : "Publication blocked"}
            </p>
            {report.currentIssues.length > 0 && (
              <ul>
                {report.currentIssues.map((finding, index) => (
                  <li key={`${finding.code}:${index}`}>
                    {findingLabels[finding.code] ??
                      finding.code.replaceAll("_", " ").toLowerCase()}
                    {finding.occurrenceIds.length > 0
                      ? ` · ${finding.occurrenceIds
                          .map((id) => {
                            const session = selected?.sessions.find(
                              (item) => item.id === id,
                            );
                            return session
                              ? `${session.courseCode}, ${formatLusaka(session.startAt)}, ${session.venueCode}`
                              : id.slice(0, 8);
                          })
                          .join("; ")}`
                      : " · whole master"}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.impact} aria-label="Publication changes">
              <span>
                <strong>{report.impact.added}</strong> added
              </span>
              <span>
                <strong>{report.impact.changed}</strong> changed
              </span>
              <span>
                <strong>{report.impact.removed}</strong> removed
              </span>
              <span>
                <strong>{report.impact.affectedLearners}</strong> affected
                learners
              </span>
            </div>
            <details>
              <summary>
                Activity changes ({report.impact.changes.length})
              </summary>
              <ul className={styles.sessions}>
                {visibleChanges.map((change) => (
                  <li key={change.sessionId}>
                    <strong>
                      {change.kind === "REMOVED"
                        ? "Cancelled"
                        : change.kind === "ADDED"
                          ? "Added"
                          : "Changed"}{" "}
                      · {(change.after ?? change.before)?.courseCode}
                    </strong>
                    {change.membershipChanged && (
                      <p>
                        Section allocation changed · {change.membershipAdded}{" "}
                        added · {change.membershipRemoved} removed.
                      </p>
                    )}
                    {change.before && (
                      <p>
                        Before: {formatLusaka(change.before.startAt)} —{" "}
                        {formatLusaka(change.before.endAt)} ·{" "}
                        {change.before.campusCode} · {change.before.venueCode} ·{" "}
                        {change.before.sectionCode} ·{" "}
                        {change.before.teacherName} ·{" "}
                        {change.before.deliveryMode
                          .replaceAll("_", " ")
                          .toLowerCase()}{" "}
                        · {change.before.courseTitle}
                      </p>
                    )}
                    {change.after && (
                      <p>
                        After: {formatLusaka(change.after.startAt)} —{" "}
                        {formatLusaka(change.after.endAt)} ·{" "}
                        {change.after.campusCode} · {change.after.venueCode} ·{" "}
                        {change.after.sectionCode} · {change.after.teacherName}{" "}
                        ·{" "}
                        {change.after.deliveryMode
                          .replaceAll("_", " ")
                          .toLowerCase()}{" "}
                        · {change.after.courseTitle}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {changes.length === 0 && <p>No activity changes.</p>}
              <nav
                className={styles.actions}
                aria-label="Activity change pages"
              >
                <button
                  type="button"
                  disabled={currentImpactPage <= 1}
                  onClick={() => setImpactPage(currentImpactPage - 1)}
                >
                  Previous changes
                </button>
                <span aria-live="polite">
                  Page {currentImpactPage} of {impactPages} · {changes.length}{" "}
                  changes
                </span>
                <button
                  type="button"
                  disabled={currentImpactPage >= impactPages}
                  onClick={() => setImpactPage(currentImpactPage + 1)}
                >
                  Next changes
                </button>
              </nav>
            </details>
            <details>
              <summary>Policy and source details</summary>
              <p>{report.policyVersion} · fictional rehearsal only.</p>
              <h3>Saved teaching rule</h3>
              <p>
                Version {report.sources.rule.version} ·{" "}
                {report.sources.rule.campusCode} ·{" "}
                {report.sources.rule.periodCode}.
              </p>
              <p>
                {report.sources.rule.teachingStartDate} to{" "}
                {report.sources.rule.teachingEndDate} ·{" "}
                {report.sources.rule.dailyStartTime}–
                {report.sources.rule.dailyEndTime} CAT.
              </p>
              <p>
                {report.sources.rule.allowedWeekdays
                  .map(
                    (day) =>
                      [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][day % 7],
                  )
                  .join(", ")}{" "}
                · maximum {report.sources.rule.maxSessionMinutes} minutes per
                session · {report.sources.rule.roomTurnaroundMinutes} minutes
                room turnaround.
              </p>
              <p>
                Maximum {report.sources.rule.maxOccurrences} occurrences.{" "}
                {report.sources.rule.campusTravelMinutes.length
                  ? "Configured campus travel:"
                  : "No cross-campus travel pairs configured."}
              </p>
              {report.sources.rule.campusTravelMinutes.length > 0 && (
                <ul>
                  {report.sources.rule.campusTravelMinutes.map((pair) => (
                    <li key={`${pair.fromCampus}:${pair.toCampus}`}>
                      {pair.fromCampus} to {pair.toCampus} · {pair.minutes}{" "}
                      minutes
                    </li>
                  ))}
                </ul>
              )}
              <h3>Source versions</h3>
              <p>
                {report.sources.matchesReviewedSources
                  ? "Current source facts match this saved master."
                  : "Current source facts do not match this saved master. Publication stays blocked."}
              </p>
              <p>
                Saved calendar:{" "}
                {report.sources.savedCalendar
                  ? `version ${report.sources.savedCalendar.version} · ${report.sources.savedCalendar.startDate} to ${report.sources.savedCalendar.endDate}`
                  : "No versioned calendar was attached."}
              </p>
              <p>
                Current checked calendar:{" "}
                {report.sources.calendar
                  ? `version ${report.sources.calendar.version} · ${report.sources.calendar.startDate} to ${report.sources.calendar.endDate}`
                  : "No versioned calendar is currently configured."}
              </p>
              <ul>
                {report.sources.savedUnits.map((unit) => (
                  <li key={unit.id}>
                    {unit.code} · {unit.kind} · {unit.status} ·{" "}
                    <span className={styles.reference}>
                      saved version {unit.versionId}
                    </span>
                  </li>
                ))}
              </ul>
              <details>
                <summary>
                  References for shown sessions ({visible.length})
                </summary>
                <ul className={styles.sessions}>
                  {visible.map((session) => (
                    <li className={styles.reference} key={session.id}>
                      <strong>
                        {session.courseCode} · {session.id}
                      </strong>
                      <p>
                        Course version {session.courseVersionId} · offering{" "}
                        {session.offeringId}
                      </p>
                      <p>
                        Section {session.sectionId} · venue {session.venueId} ·
                        teaching appointment {session.teacherAssignmentId}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
              <p className={styles.reference}>
                Master digest: <code>{report.draft.contentDigest}</code>
              </p>
              <p className={styles.reference}>
                Saved source fingerprint:{" "}
                <code>{report.sources.sourceFingerprint ?? "Unavailable"}</code>
              </p>
              <p className={styles.reference}>
                Current source fingerprint:{" "}
                <code>
                  {report.sources.currentFingerprint ?? "Unavailable"}
                </code>
              </p>
              <ul>
                {report.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </details>
          </section>
          <section className={styles.panel}>
            <h2>Independent approval</h2>
            {currentPublished ? (
              <p>This master is the current published fictional timetable.</p>
            ) : report.ownProposal ? (
              <p>You prepared this master. Another person must approve it.</p>
            ) : !report.canPublish ? (
              <p>
                An appointed fictional publication reviewer completes this step.
              </p>
            ) : !report.currentReady ? (
              <p>Correct the master and save a new version before approval.</p>
            ) : null}
            {(canDecide || intent) && (
              <form onSubmit={publish} className={styles.stack}>
                <label className={styles.field}>
                  Reason for publication
                  <textarea
                    required
                    minLength={10}
                    maxLength={500}
                    value={reason}
                    disabled={pending || Boolean(intent)}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    disabled={pending || Boolean(intent)}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  I reviewed this exact master, current findings and changes.
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={fictional}
                    disabled={pending || Boolean(intent)}
                    onChange={(event) => setFictional(event.target.checked)}
                  />
                  I approve publication for the fictional rehearsal within my
                  assigned authority.
                </label>
                <label className={styles.field}>
                  Confirm your password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    disabled={pending}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <p className={styles.context}>
                  Fictional password reconfirmation. Institutional MFA is
                  separate.
                </p>
                <button
                  className={styles.primary}
                  type="submit"
                  disabled={
                    pending ||
                    loading ||
                    draftLoading ||
                    !password ||
                    (!intent &&
                      (!reviewed ||
                        !fictional ||
                        reason.trim().length < 10 ||
                        !canDecide))
                  }
                >
                  {pending
                    ? "Publishing…"
                    : intent
                      ? "Retry publication"
                      : "Approve and publish"}
                </button>
              </form>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Publication history</h2>
            {report.latestPublication && (
              <p>
                Current timetable: fictional publication{" "}
                {report.latestPublication.version} ·{" "}
                {formatLusaka(report.latestPublication.publishedAt)}.
              </p>
            )}
            {report.publications.length ? (
              <ol className={styles.history}>
                {report.publications.map((publication) => (
                  <li key={publication.publicationId}>
                    <strong>
                      Publication {publication.version} ·{" "}
                      {publication.isCurrent ? "current" : "superseded"} ·
                      master{" "}
                      {publication.masterDraftId === selectedId
                        ? report.draft.version
                        : publication.masterDraftId.slice(0, 8)}
                    </strong>
                    <p>
                      {formatLusaka(publication.publishedAt)} ·{" "}
                      {publication.reason}
                    </p>
                    <small>{publication.publicationId}</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No timetable published for this period.</p>
            )}
            <nav
              className={styles.actions}
              aria-label="Publication history pages"
            >
              <button
                type="button"
                disabled={
                  historyPages.length <= 1 ||
                  pending ||
                  loading ||
                  Boolean(intent)
                }
                onClick={() => {
                  const next = historyPages.slice(0, -1);
                  void checkHistory(next.at(-1), null, next);
                }}
              >
                Newer publications
              </button>
              <span aria-live="polite">History page {historyPages.length}</span>
              <button
                type="button"
                disabled={
                  !report.olderVersionCursor ||
                  pending ||
                  loading ||
                  Boolean(intent)
                }
                onClick={() => {
                  void checkHistory(
                    report.olderVersionCursor ?? undefined,
                    null,
                    [...historyPages, report.olderVersionCursor ?? undefined],
                  );
                }}
              >
                Older publications
              </button>
            </nav>
          </section>
        </>
      )}
    </div>
  );
}
