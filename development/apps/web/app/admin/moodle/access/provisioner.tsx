"use client";
import staffUi from "../../staff-workspace.module.css";

import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";
import { Notice } from "@sis/ui";
import type { ConnectionView } from "@sis/contracts";

/**
 * Delegated Moodle access workspace (design 2026-10-22).
 *
 * Search students inside the actor's scope, pick one student or a whole
 * cohort, choose how long access lasts, then create one provisioning
 * request. The API enforces capability, scope and enrolment rules; this
 * surface never decides authority itself.
 */

type Course = {
  courseRegistrationId: string;
  courseCode: string;
  courseTitle: string;
  state: string;
  moodleState: string | null;
};

type StudentHit = {
  studentId: string;
  studentNumber: string;
  displayName: string;
  status: string;
  programmeCode: string | null;
  programmeName: string | null;
  periodCodes: string[];
  courses: Course[];
};

type RequestItem = {
  id: string;
  state: string;
  validUntil: string | null;
  validityPolicy: string | null;
  student?: { studentNumber: string } | null;
};

type ProvisionRequest = {
  id: string;
  state: string;
  reason: string | null;
  createdAt: string;
  validUntil: string | null;
  requester?: { username: string } | null;
  items: RequestItem[];
};

type ValidityPolicy = "THIS_PERIOD" | "ACADEMIC_YEAR" | "WHILE_ENROLLED";

const POLICIES: { value: ValidityPolicy; label: string; help: string }[] = [
  {
    value: "THIS_PERIOD",
    label: "Until the end of this period",
    help: "Access ends when the registered academic period ends.",
  },
  {
    value: "ACADEMIC_YEAR",
    label: "Until the end of this academic year",
    help: "Access ends when the enclosing academic year ends.",
  },
  {
    value: "WHILE_ENROLLED",
    label: "While the student is enrolled",
    help: "Access lasts while the student stays active and enrolled.",
  },
];

const STATE_LABEL: Record<string, string> = {
  PENDING: "Queued",
  IN_FLIGHT: "In progress",
  DELIVERED: "Delivered",
  FAILED: "Needs attention",
  REVOKED: "Revoked",
  REQUESTED: "Requested",
  COMPLETED: "Completed",
  PARTIAL: "Partly delivered",
};

function label(state: string) {
  return STATE_LABEL[state] ?? state;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data as { message?: string; supportReference?: string };
    throw new Error(
      `${detail.message ?? "The provisioning service could not complete this request."}${
        detail.supportReference
          ? ` Support reference: ${detail.supportReference}.`
          : ""
      }`,
    );
  }
  return data as T;
}

export function Provisioner({
  initialRequests,
  backend,
}: {
  initialRequests: ProvisionRequest[];
  backend: ConnectionView["backend"];
}) {
  const [q, setQ] = useState("");
  const [periodCode, setPeriodCode] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [hasAccess, setHasAccess] = useState("");
  const [results, setResults] = useState<StudentHit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Record<string, { studentId: string; label: string }>>({});
  const [policy, setPolicy] = useState<ValidityPolicy>("WHILE_ENROLLED");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [requests, setRequests] = useState<ProvisionRequest[]>(initialRequests);
  const [revokeFor, setRevokeFor] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequence = useRef(0);

  const selectedCount = Object.keys(selected).length;

  const search = useCallback(
    async (
      cursor?: string,
      override?: { q?: string; periodCode?: string; courseCode?: string; hasAccess?: string },
    ) => {
      const sequence = ++searchSequence.current;
      setSearching(true);
      setError(null);
      const query = new URLSearchParams();
      const filters = {
        q: override?.q ?? q,
        periodCode: override?.periodCode ?? periodCode,
        courseCode: override?.courseCode ?? courseCode,
        hasAccess: override?.hasAccess ?? hasAccess,
      };
      if (filters.q.trim()) query.set("q", filters.q.trim());
      if (filters.periodCode.trim()) query.set("periodCode", filters.periodCode.trim());
      if (filters.courseCode.trim()) query.set("courseCode", filters.courseCode.trim());
      if (filters.hasAccess) query.set("hasMoodleAccess", filters.hasAccess);
      if (cursor) query.set("cursor", cursor);
      query.set("limit", "25");
      try {
        const data = await call<{
          items: StudentHit[];
          total: number;
          nextCursor: string | null;
        }>(`/api/moodle/provision/students/search?${query.toString()}`);
        if (sequence !== searchSequence.current) return;
        setResults((current) => (cursor && current ? [...current, ...data.items] : data.items));
        setTotal(data.total);
        setNextCursor(data.nextCursor);
      } catch (caught) {
        if (sequence !== searchSequence.current) return;
        setError(caught instanceof Error ? caught.message : "Search failed.");
        setResults([]);
        setTotal(0);
        setNextCursor(null);
      } finally {
        if (sequence === searchSequence.current) setSearching(false);
      }
    },
    [q, periodCode, courseCode, hasAccess],
  );

  useEffect(() => {
    searchTimer.current = setTimeout(() => void search(), q.trim() ? 250 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [q, periodCode, courseCode, hasAccess, search]);

  function invalidateSearch() {
    searchSequence.current += 1;
    setSelected({});
    setResults(null);
    setNextCursor(null);
    setError(null);
  }

  function toggle(key: string, student: StudentHit, course: Course) {
    setSelected((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else
        next[key] = {
          studentId: student.studentId,
          label: `${student.studentNumber} · ${course.courseCode}`,
        };
      return next;
    });
  }

  function toggleStudent(student: StudentHit) {
    const open = student.courses.filter((c) => c.state === "ENROLLED" && !c.moodleState);
    const allSelected = open.every((c) => selected[`${student.studentId}:${c.courseRegistrationId}`]);
    setSelected((current) => {
      const next = { ...current };
      for (const course of open) {
        const key = `${student.studentId}:${course.courseRegistrationId}`;
        if (allSelected) delete next[key];
        else
          next[key] = {
            studentId: student.studentId,
            label: `${student.studentNumber} · ${course.courseCode}`,
          };
      }
      return next;
    });
  }

  async function submit() {
    if (busy) return;
    if (selectedCount === 0) {
      setError("Choose at least one student and course before assigning access.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const entries = Object.entries(selected);
    try {
      const result = await call<{ requestId: string; items?: unknown[] }>(
        "/api/moodle/provision",
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            studentIds: entries.map(([, value]) => value.studentId),
            courseRegistrationIds: entries.map(([key]) => key.split(":")[1]),
            validityPolicy: policy,
            reason: reason.trim() || undefined,
          }),
        },
      );
      setNotice(
        `Provisioning request ${result.requestId.slice(0, 8)} recorded for ${entries.length} course assignment${entries.length === 1 ? "" : "s"}. Access is delivered in the background and appears in the request list below.`,
      );
      setSelected({});
      setReason("");
      const refreshed = await call<ProvisionRequest[]>(
        "/api/moodle/provision?limit=10",
      );
      setRequests(refreshed);
      await search();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request was not recorded.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(requestId: string) {
    if (revokeReason.trim().length < 3) {
      setError("Record why access is being withdrawn (at least 3 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await call(`/api/moodle/provision/${requestId}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });
      setNotice("Access withdrawn. Moodle enrolment is suspended, not deleted, and the decision is audited.");
      setRevokeFor(null);
      setRevokeReason("");
      const refreshed = await call<ProvisionRequest[]>(
        "/api/moodle/provision?limit=10",
      );
      setRequests(refreshed);
      await search();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The revocation was not recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? <Notice severity="warning" title="Moodle access" message={error} /> : null}
      {notice ? <Notice severity="success" title="Moodle access" message={notice} /> : null}

      <section className={staffUi.panel} aria-labelledby="moodle-search-title">
        <h2 id="moodle-search-title" className={staffUi.sectionHeading}>
          Find students
        </h2>
        <p className={staffUi.supporting}>
          Search by name or student number, or browse active students in your
          authorized scope. Only active registered courses without an existing
          Moodle request can be selected.
        </p>
        <form
          className={staffUi.form}
          onSubmit={(event) => {
            event.preventDefault();
            if (searchTimer.current) clearTimeout(searchTimer.current);
            void search();
          }}
        >
          <div className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="moodle-q">
              Search students
            </label>
            <input
              id="moodle-q"
              className={staffUi.control}
              value={q}
              onChange={(event) => {
                invalidateSearch();
                setQ(event.target.value);
              }}
              placeholder="Name or student number"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className={staffUi.actions}>
            <button className={staffUi.primary} type="submit" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
            <button
              className={staffUi.secondary}
              type="button"
              disabled={searching}
              onClick={() => {
                const alreadyBrowsing = !q && !periodCode && !courseCode && !hasAccess;
                invalidateSearch();
                setQ("");
                setPeriodCode("");
                setCourseCode("");
                setHasAccess("");
                if (alreadyBrowsing)
                  void search(undefined, { q: "", periodCode: "", courseCode: "", hasAccess: "" });
              }}
            >
              Browse active students
            </button>
          </div>
          <details>
            <summary className={staffUi.fieldLabel}>More filters</summary>
            <div className={staffUi.form}>
              <div className={staffUi.formField}>
                <label className={staffUi.fieldLabel} htmlFor="moodle-period">
                  Period code
                </label>
                <input
                  id="moodle-period"
                  className={staffUi.control}
                  value={periodCode}
                  onChange={(event) => {
                    invalidateSearch();
                    setPeriodCode(event.target.value);
                  }}
                  placeholder="e.g. 2026S1"
                  autoComplete="off"
                />
              </div>
              <div className={staffUi.formField}>
                <label className={staffUi.fieldLabel} htmlFor="moodle-course">
                  Course code
                </label>
                <input
                  id="moodle-course"
                  className={staffUi.control}
                  value={courseCode}
                  onChange={(event) => {
                    invalidateSearch();
                    setCourseCode(event.target.value);
                  }}
                  placeholder="e.g. SWE111"
                  autoComplete="off"
                />
              </div>
              <div className={staffUi.formField}>
                <label className={staffUi.fieldLabel} htmlFor="moodle-has-access">
                  Moodle access
                </label>
                <select
                  id="moodle-has-access"
                  className={staffUi.control}
                  value={hasAccess}
                  onChange={(event) => {
                    invalidateSearch();
                    setHasAccess(event.target.value);
                  }}
                >
                  <option value="">Any</option>
                  <option value="false">No delivered request</option>
                  <option value="true">Already delivered</option>
                </select>
              </div>
            </div>
          </details>
        </form>
      </section>

      <section className={staffUi.panel} aria-labelledby="moodle-results-title">
        <h2 id="moodle-results-title" className={staffUi.sectionHeading}>
          Students {results ? `(${total} matching, ${results.length} shown)` : ""}
        </h2>
        {results === null ? (
          <p className={staffUi.empty}>Searching…</p>
        ) : results.length === 0 ? (
          <p className={staffUi.empty}>
            No students match these filters inside your scope. Widen the search
            or check the period and course codes.
          </p>
        ) : (
          <ul className={staffUi.recordList}>
            {results.map((student) => {
              const assignable = student.courses.filter((course) => course.state === "ENROLLED");
              const open = assignable.filter((course) => !course.moodleState);
              const selectedForStudent = open.filter(
                (course) => selected[`${student.studentId}:${course.courseRegistrationId}`],
              ).length;
              const allOpenSelected = open.length > 0 && selectedForStudent === open.length;
              const partiallySelected = selectedForStudent > 0 && !allOpenSelected;
              const studentSelectionRef: RefCallback<HTMLInputElement> = (element) => {
                if (element) element.indeterminate = partiallySelected;
              };
              return (
                <li key={student.studentId}>
                  <div>
                    <label className={staffUi.supporting}>
                      <input
                        type="checkbox"
                        aria-label={`Select eligible Moodle courses for ${student.displayName}`}
                        checked={allOpenSelected}
                        disabled={open.length === 0}
                        ref={studentSelectionRef}
                        onChange={() => toggleStudent(student)}
                      />{" "}
                      <strong>{student.displayName}</strong>
                    </label>{" "}
                    <span className={staffUi.supporting}>
                      {student.studentNumber}
                      {student.programmeCode ? ` · ${student.programmeCode}` : ""}
                      {student.periodCodes.length ? ` · ${student.periodCodes.join(", ")}` : ""}
                      {` · ${student.status}`}
                    </span>
                  </div>
                  {assignable.length === 0 ? (
                    <p className={staffUi.supporting}>
                      No active course registration in this view, so access
                      cannot be assigned yet.
                    </p>
                  ) : (
                    <>
                      <fieldset className={staffUi.form}>
                        <legend className={staffUi.fieldLabel}>
                          Registered courses for this student
                        </legend>
                        {assignable.map((course) => {
                          const key = `${student.studentId}:${course.courseRegistrationId}`;
                          const statusHintId = `moodle-state-${student.studentId}-${course.courseRegistrationId}`;
                          return (
                            <label key={key} className={staffUi.supporting}>
                              <input
                                type="checkbox"
                                checked={Boolean(selected[key])}
                                disabled={Boolean(course.moodleState)}
                                aria-describedby={course.moodleState ? statusHintId : undefined}
                                onChange={() => toggle(key, student, course)}
                              />{" "}
                              {course.courseCode} — {course.courseTitle}
                              {course.moodleState
                                ? ` (Moodle request: ${label(course.moodleState)})`
                                : ""}
                              {course.moodleState ? (
                                <span id={statusHintId} className={staffUi.supporting}>
                                  {backend === "simulator"
                                    ? ` Simulator request state: ${label(course.moodleState)}. This does not confirm MoodleCloud access.`
                                    : ` Existing request state: ${label(course.moodleState)}. A new request is unavailable until it is resolved.`}
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </fieldset>
                      {open.length === 0 ? (
                        <p className={staffUi.supporting}>
                          Every active registered course already has a Moodle request. Duplicate requests are disabled; review the request state above.
                        </p>
                      ) : null}
                      {open.length > 1 ? (
                        <button
                          type="button"
                          className={staffUi.secondary}
                          onClick={() => toggleStudent(student)}
                        >
                          Select all open courses for this student
                        </button>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {nextCursor ? (
          <div className={staffUi.actions}>
            <button
              type="button"
              className={staffUi.secondary}
              disabled={searching}
              onClick={() => void search(nextCursor)}
            >
              Load more students
            </button>
          </div>
        ) : null}
      </section>

      <section className={staffUi.panel} aria-labelledby="moodle-assign-title">
        <h2 id="moodle-assign-title" className={staffUi.sectionHeading}>
          Assign access ({selectedCount} selected)
        </h2>
        {selectedCount === 0 ? (
          <p className={staffUi.empty}>
            Select at least one student and course above. Choosing several
            students assigns the same access policy to the whole cohort.
          </p>
        ) : (
          <ul className={staffUi.recordList}>
            {Object.entries(selected).map(([key, value]) => (
              <li key={key}>
                <span>{value.label}</span>{" "}
                <button
                  type="button"
                  className={staffUi.secondary}
                  onClick={() =>
                    setSelected((current) => {
                      const next = { ...current };
                      delete next[key];
                      return next;
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className={staffUi.form}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="moodle-policy">
              How long should access last?
            </label>
            <select
              id="moodle-policy"
              className={staffUi.control}
              value={policy}
              onChange={(event) => setPolicy(event.target.value as ValidityPolicy)}
            >
              {POLICIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className={staffUi.supporting}>
              {POLICIES.find((option) => option.value === policy)?.help}
            </p>
          </div>
          <div className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="moodle-reason">
              Why is access being granted? (optional)
            </label>
            <input
              id="moodle-reason"
              className={staffUi.control}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Course rollover for the new semester"
            />
          </div>
          <div className={staffUi.actions}>
            <button
              className={staffUi.primary}
              type="submit"
              disabled={busy || selectedCount === 0}
            >
              {busy ? "Recording…" : "Assign Moodle access"}
            </button>
          </div>
        </form>
      </section>

      <section className={staffUi.panel} aria-labelledby="moodle-requests-title">
        <h2 id="moodle-requests-title" className={staffUi.sectionHeading}>
          Recent requests
        </h2>
        {requests.length === 0 ? (
          <p className={staffUi.empty}>No provisioning requests recorded yet.</p>
        ) : (
          <table className={staffUi.table}>
            <caption className={staffUi.supporting}>
              Requests are delivered in the background. Withdrawing access
              suspends the Moodle enrolment and keeps the history.
            </caption>
            <thead>
              <tr>
                <th scope="col">Requested</th>
                <th scope="col">State</th>
                <th scope="col">Assignments</th>
                <th scope="col">Valid until</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    {new Date(request.createdAt).toLocaleString()}
                    {request.requester?.username ? ` · ${request.requester.username}` : ""}
                  </td>
                  <td>{label(request.state)}</td>
                  <td>
                    {request.items.length}
                    {request.items.some((item) => item.state === "FAILED")
                      ? ` · ${request.items.filter((item) => item.state === "FAILED").length} need attention`
                      : ""}
                  </td>
                  <td>
                    {request.validUntil
                      ? new Date(request.validUntil).toLocaleDateString()
                      : "While enrolled"}
                  </td>
                  <td>
                    {request.state === "REVOKED" ? (
                      <span className={staffUi.supporting}>Withdrawn</span>
                    ) : revokeFor === request.id ? (
                      <form
                        className={staffUi.form}
                        onSubmit={(event) => {
                          event.preventDefault();
                          void revoke(request.id);
                        }}
                      >
                        <label className={staffUi.fieldLabel} htmlFor={`revoke-${request.id}`}>
                          Reason for withdrawal
                        </label>
                        <input
                          id={`revoke-${request.id}`}
                          className={staffUi.control}
                          value={revokeReason}
                          onChange={(event) => setRevokeReason(event.target.value)}
                        />
                        <div className={staffUi.actions}>
                          <button className={staffUi.primary} type="submit" disabled={busy}>
                            Confirm withdrawal
                          </button>
                          <button
                            type="button"
                            className={staffUi.secondary}
                            onClick={() => {
                              setRevokeFor(null);
                              setRevokeReason("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className={staffUi.secondary}
                        onClick={() => {
                          setRevokeFor(request.id);
                          setRevokeReason("");
                          setError(null);
                        }}
                      >
                        Withdraw access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
