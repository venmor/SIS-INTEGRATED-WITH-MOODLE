"use client";

import { useId, useMemo, useState } from "react";
import type {
  TimetablePublicationChange,
  TimetablePublishedSession,
} from "@sis/contracts";
import { Notice } from "@sis/ui";
import { formatLusaka, formatLusakaDate } from "../../../lib/time";
import {
  RegisteredCourseView,
  RefreshTimetable,
  type TimetableAvailability,
} from "./timetable-view";
import styles from "./timetable.module.css";

export interface PublishedTimetableData extends Omit<
  TimetableAvailability,
  "publicationStatus"
> {
  publicationStatus: "FICTIONAL_PUBLISHED";
  publication: {
    id: string;
    version: number;
    masterVersion: number;
    contentDigest: string;
    publishedAt: string;
    previousVersion: number | null;
  };
  sessions: TimetablePublishedSession[];
  changes: TimetablePublicationChange[];
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lusaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lusaka",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lusaka",
  hour: "2-digit",
  minute: "2-digit",
});

function dayKey(iso: string) {
  const parts = dayFormatter.formatToParts(new Date(iso));
  const get = (name: string) => parts.find((part) => part.type === name)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function weekKey(day: string) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function PublishedTimetableView({
  data,
}: {
  data: PublishedTimetableData;
}) {
  return (
    <PublishedSessions
      key={`${data.attemptId ?? "current"}:${data.period}:${data.publication.id}`}
      data={data}
    />
  );
}

function PublishedSessions({ data }: { data: PublishedTimetableData }) {
  const id = useId();
  const sessions = useMemo(
    () =>
      data.sessions
        .map((session) => ({
          ...session,
          day: dayKey(session.startAt),
          week: weekKey(dayKey(session.startAt)),
        }))
        .sort(
          (a, b) =>
            Date.parse(a.startAt) - Date.parse(b.startAt) ||
            a.courseCode.localeCompare(b.courseCode) ||
            a.id.localeCompare(b.id),
        ),
    [data.sessions],
  );
  const weeks = [...new Set(sessions.map((session) => session.week))];
  const courses = [
    ...new Map(
      data.groups.flatMap((group) =>
        group.courses.map((course) => [course.code, course.title] as const),
      ),
    ).entries(),
  ];
  const [week, setWeek] = useState(weeks[0] ?? "ALL");
  const [course, setCourse] = useState("");
  const [day, setDay] = useState("");
  const [view, setView] = useState<"list" | "day" | "week">("list");
  const [page, setPage] = useState(1);
  const filtered = sessions.filter(
    (session) =>
      (week === "ALL" || session.week === week) &&
      (!course || session.courseCode === course) &&
      (!day || session.day === day),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * 10;
  const visible = filtered.slice(start, start + 10);
  // Count the complete selected source, never just its ten visible records or
  // historical change entries. These values describe this publication only.
  const selectedCourseCount = new Set(
    filtered.map((session) => session.courseCode),
  ).size;
  const selectedDayCount = new Set(filtered.map((session) => session.day)).size;
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, index) => {
          const date = new Date(`${week}T12:00:00.000Z`);
          date.setUTCDate(date.getUTCDate() + index);
          return date.toISOString().slice(0, 10);
        })
      : [...new Set(visible.map((session) => session.day))];
  const availableDays = [
    ...new Set(
      sessions
        .filter(
          (session) =>
            (week === "ALL" || session.week === week) &&
            (!course || session.courseCode === course),
        )
        .map((session) => session.day),
    ),
  ];
  const scheduledCourses = new Set(
    sessions.map((session) => session.courseCode),
  );
  const missingCourses = [
    ...new Set(
      data.groups.flatMap((group) => group.courses.map((entry) => entry.code)),
    ),
  ].filter((code) => !scheduledCourses.has(code));
  const selectedPending = !!course && missingCourses.includes(course);
  const weekIndex = weeks.indexOf(week);
  const changeWeek = (value: string) => {
    setWeek(value);
    setPage(1);
    setDay("");
  };

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>
            Current fictional timetable · Version {data.publication.version}
          </p>
          <h2 id={`${id}-title`}>Class sessions</h2>
        </div>
        <RefreshTimetable />
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Academic period</dt>
          <dd>{data.period}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>
            <time dateTime={data.publication.publishedAt}>
              {formatLusaka(data.publication.publishedAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Last checked</dt>
          <dd>
            <time dateTime={data.checkedAt}>
              {formatLusaka(data.checkedAt)}
            </time>
          </dd>
        </div>
      </dl>
      <p className={styles.meta}>Africa/Lusaka (CAT)</p>
      {missingCourses.length ? (
        <Notice
          severity="info"
          title="Courses without published sessions"
          message={`${missingCourses.length} registered courses have no sessions in this publication. Your registration is unchanged. Check the registered course list below.`}
        />
      ) : null}
      {sessions.length ? (
        <>
          <div className={styles.filters}>
            <div>
              <label htmlFor={`${id}-course`}>Course</label>
              <select
                id={`${id}-course`}
                value={course}
                onChange={(event) => {
                  setCourse(event.target.value);
                  setPage(1);
                  setDay("");
                }}
              >
                <option value="">All registered courses</option>
                {courses.map(([code, title]) => (
                  <option key={code} value={code}>
                    {code} — {title}
                    {missingCourses.includes(code)
                      ? " · Timetable being prepared"
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            {view === "day" ? (
              <div>
                <label htmlFor={`${id}-day`}>Teaching day</label>
                <select
                  id={`${id}-day`}
                  value={day}
                  onChange={(event) => {
                    setDay(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All days in this week</option>
                  {availableDays.map((value) => (
                    <option key={value} value={value}>
                      {dateFormatter.format(new Date(`${value}T12:00:00.000Z`))}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label htmlFor={`${id}-week`}>Teaching week</label>
              <select
                id={`${id}-week`}
                value={week}
                onChange={(event) => {
                  changeWeek(event.target.value);
                  if (event.target.value === "ALL") setView("list");
                }}
              >
                <option value="ALL">All published weeks</option>
                {weeks.map((value) => (
                  <option key={value} value={value}>
                    Week of {formatLusakaDate(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.viewControls}>
            <fieldset className={styles.viewOptions}>
              <legend>Session view</legend>
              <label>
                <input
                  type="radio"
                  name={`${id}-view`}
                  checked={view === "week"}
                  onChange={() => {
                    setView("week");
                    setPage(1);
                    setDay("");
                    if (week === "ALL") setWeek(weeks[0]);
                  }}
                />{" "}
                Week
              </label>
              <label>
                <input
                  type="radio"
                  name={`${id}-view`}
                  checked={view === "list"}
                  onChange={() => {
                    setView("list");
                    setPage(1);
                    setDay("");
                  }}
                />{" "}
                List
              </label>
              <label>
                <input
                  type="radio"
                  name={`${id}-view`}
                  checked={view === "day"}
                  onChange={() => {
                    setView("day");
                    setPage(1);
                    setDay("");
                    if (week === "ALL") setWeek(weeks[0]);
                  }}
                />{" "}
                By day
              </label>
            </fieldset>
            {week !== "ALL" ? (
              <nav aria-label="Teaching weeks" className={styles.weekButtons}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={weekIndex <= 0}
                  onClick={() => changeWeek(weeks[weekIndex - 1])}
                >
                  Previous teaching week
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={weekIndex >= weeks.length - 1}
                  onClick={() => changeWeek(weeks[weekIndex + 1])}
                >
                  Next teaching week
                </button>
              </nav>
            ) : null}
          </div>
          <section
            className={styles.overview}
            aria-labelledby={`${id}-overview-title`}
          >
            <div>
              <h3 id={`${id}-overview-title`}>Timetable overview</h3>
              <p className={styles.meta}>
                Current filter · Full publication source before paging · CAT
              </p>
            </div>
            <dl className={styles.overviewFacts}>
              <div>
                <dt>Published sessions</dt>
                <dd>
                  {filtered.length} session{filtered.length === 1 ? "" : "s"}
                </dd>
              </div>
              <div>
                <dt>Courses with sessions</dt>
                <dd>
                  {selectedCourseCount} course
                  {selectedCourseCount === 1 ? "" : "s"}
                </dd>
              </div>
              <div>
                <dt>Session start dates</dt>
                <dd>
                  {selectedDayCount} date
                  {selectedDayCount === 1 ? "" : "s"}
                </dd>
              </div>
            </dl>
          </section>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={styles.meta}
          >
            {filtered.length
              ? `Showing ${start + 1}–${Math.min(start + 10, filtered.length)} of ${filtered.length} sessions${week !== "ALL" ? ` · Week of ${formatLusakaDate(week)}` : ""}`
              : "No published sessions match this course and week"}
          </p>
          {selectedPending ? (
            <Notice
              severity="info"
              title="Selected course timetable being prepared"
              message={`${course} is registered but has no sessions in this publication. Your registration is unchanged. Check again later.`}
            />
          ) : !visible.length ? (
            <div className={styles.empty}>
              <p>
                No published sessions match this course and week. Choose another
                course or week.
              </p>
            </div>
          ) : view === "list" ? (
            <ul
              className={styles.sessionList}
              aria-label="Published class sessions"
            >
              {visible.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </ul>
          ) : (
            <div
              role="region"
              aria-label={
                view === "week" ? "Sessions by week" : "Sessions by day"
              }
              className={styles.dayGrid}
            >
              {days.map((day) => (
                <section
                  key={day}
                  className={styles.dayPanel}
                  aria-label={dateFormatter.format(
                    new Date(`${day}T12:00:00.000Z`),
                  )}
                >
                  <h3>
                    {dateFormatter.format(new Date(`${day}T12:00:00.000Z`))}
                  </h3>
                  {visible.some((session) => session.day === day) ? (
                    <ul
                      className={styles.sessionList}
                      aria-label={`Sessions on ${day}`}
                    >
                      {visible
                        .filter((session) => session.day === day)
                        .map((session) => (
                          <SessionCard key={session.id} session={session} />
                        ))}
                    </ul>
                  ) : (
                    <p className={styles.meta}>
                      {filtered.some((session) => session.day === day)
                        ? "Sessions on this date are on another page."
                        : "No published sessions on this date."}
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}
          {pages > 1 ? (
            <nav aria-label="Session pages" className={styles.pagination}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous sessions
              </button>
              <span>
                Page {currentPage} of {pages}
              </span>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next sessions
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <div className={styles.empty}>
          <h3>No published sessions for your current courses</h3>
          <p>
            This rehearsal publication has no current session entitlement for
            your registered courses. Your registration is unchanged.
          </p>
        </div>
      )}
      {data.changes.length ? <ChangeHistory data={data} /> : null}
      <details className={styles.sourceDetails}>
        <summary>Registered course list</summary>
        <RegisteredCourseView data={data} publicationPending={false} />
      </details>
      <details className={styles.sourceDetails}>
        <summary>Publication details</summary>
        <dl>
          <div>
            <dt>Programme attempt reference</dt>
            <dd>{data.attemptId}</dd>
          </div>
          <div>
            <dt>Publication reference</dt>
            <dd>{data.publication.id}</dd>
          </div>
          <div>
            <dt>Master preview version</dt>
            <dd>{data.publication.masterVersion}</dd>
          </div>
          <div>
            <dt>Content digest</dt>
            <dd>{data.publication.contentDigest}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

function SessionCard({ session }: { session: TimetablePublishedSession }) {
  return (
    <li className={styles.session}>
      <p className={styles.courseName}>
        <strong>{session.courseCode}</strong> — {session.courseTitle}
      </p>
      <p className={styles.sessionDate}>
        {dateFormatter.format(new Date(session.startAt))}
        {dayKey(session.startAt) !== dayKey(session.endAt) ? (
          <> to {dateFormatter.format(new Date(session.endAt))}</>
        ) : null}
      </p>
      <dl className={styles.sessionFacts}>
        <div>
          <dt>Status</dt>
          <dd>Scheduled</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            <time dateTime={session.startAt}>
              {timeFormatter.format(new Date(session.startAt))}
            </time>{" "}
            –{" "}
            <time dateTime={session.endAt}>
              {timeFormatter.format(new Date(session.endAt))}
            </time>{" "}
            CAT
          </dd>
        </div>
        <div>
          <dt>Venue</dt>
          <dd>{session.venueCode}</dd>
        </div>
      </dl>
      <details className={styles.sessionDetails}>
        <summary>Session details</summary>
        <dl>
          <div>
            <dt>Activity</dt>
            <dd>{session.activityType}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{session.sectionCode}</dd>
          </div>
          <div>
            <dt>Campus</dt>
            <dd>{session.campusCode}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>
              {session.deliveryMode
                .replaceAll("_", " ")
                .toLocaleLowerCase("en")}
            </dd>
          </div>
          {session.teacherName ? (
            <div>
              <dt>Teaching staff</dt>
              <dd>{session.teacherName}</dd>
            </div>
          ) : null}
        </dl>
      </details>
    </li>
  );
}

function ChangeHistory({ data }: { data: PublishedTimetableData }) {
  const [page, setPage] = useState(1);
  const pages = Math.ceil(data.changes.length / 10);
  const start = (page - 1) * 10;
  return (
    <details className={styles.sourceDetails}>
      <summary>Timetable changes</summary>
      <p className={styles.meta}>
        Previous version {data.publication.previousVersion} → Current version{" "}
        {data.publication.version}. Updated{" "}
        {formatLusaka(data.publication.publishedAt)}. Check the current sessions
        above when planning your classes.
      </p>
      <p
        className={styles.meta}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Showing {start + 1}–{Math.min(start + 10, data.changes.length)} of{" "}
        {data.changes.length} changes
      </p>
      <ul className={styles.sessionList} aria-label="Timetable changes">
        {data.changes.slice(start, start + 10).map((change) => (
          <li key={change.sessionId} className={styles.session}>
            <h3>
              {change.kind === "ADDED"
                ? "Session added"
                : change.kind === "CHANGED"
                  ? "Session changed"
                  : "Session removed"}
            </h3>
            {change.kind === "REMOVED" ? (
              <p>
                Cancelled in current version. This activity is no longer
                scheduled.
              </p>
            ) : null}
            {change.before ? (
              <HistoricalSession
                title={`Previous version ${data.publication.previousVersion}`}
                session={change.before}
              />
            ) : null}
            {change.after ? (
              <HistoricalSession
                title={`Current version ${data.publication.version}`}
                session={change.after}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <nav className={styles.pagination} aria-label="Timetable change pages">
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous changes
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={page === pages}
            onClick={() => setPage(page + 1)}
          >
            Next changes
          </button>
        </nav>
      ) : null}
    </details>
  );
}

function HistoricalSession({
  title,
  session,
}: {
  title: string;
  session: TimetablePublishedSession;
}) {
  return (
    <div>
      <h4>{title}</h4>
      <p className={styles.courseName}>
        <strong>{session.courseCode}</strong> — {session.courseTitle}
      </p>
      <dl className={styles.changeFacts}>
        <div>
          <dt>Time</dt>
          <dd>
            <time dateTime={session.startAt}>
              {formatLusaka(session.startAt)}
            </time>{" "}
            –{" "}
            <time dateTime={session.endAt}>{formatLusaka(session.endAt)}</time>
          </dd>
        </div>
        <div>
          <dt>Venue / campus</dt>
          <dd>
            <span>{session.venueCode}</span> · {session.campusCode}
          </dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd>{session.sectionCode}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>
            {session.deliveryMode.replaceAll("_", " ").toLocaleLowerCase("en")}
          </dd>
        </div>
        {session.teacherName ? (
          <div>
            <dt>Teaching staff</dt>
            <dd>{session.teacherName}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
