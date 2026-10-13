"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { formatLusaka } from "../../../lib/time";
import styles from "./timetable.module.css";

export interface TimetableAvailability {
  attemptId?: string;
  period: string;
  publicationStatus: "AWAITING_PUBLICATION";
  checkedAt: string;
  note: string;
  groups: Array<{
    semester: string;
    courses: Array<{ code: string; title: string }>;
  }>;
}

const dateMarkerEvent = "sis-timetable-date-confirmed";

function subscribeToDateMarker(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(dateMarkerEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(dateMarkerEvent, callback);
  };
}

function readDateMarker(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    return value &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value
      ? value
      : null;
  } catch {
    return null;
  }
}

export function LastConfirmedDate({
  scopeKey,
  checkedAt,
  unavailable,
}: {
  scopeKey: string;
  checkedAt: string | null;
  unavailable: boolean;
}) {
  const key = `sis.timetable-confirmed.v1:${scopeKey}`;
  const date = useSyncExternalStore(
    subscribeToDateMarker,
    () => readDateMarker(key),
    () => null,
  );
  useEffect(() => {
    if (!checkedAt) return;
    try {
      // The value is only a confirmed read timestamp. The opaque server key
      // binds actor + attempt + period; no courses or session facts are stored.
      sessionStorage.setItem(key, checkedAt);
      window.dispatchEvent(new Event(dateMarkerEvent));
    } catch {
      // Storage may be disabled. Current data and fail-closed errors still work.
    }
  }, [checkedAt, key]);
  return unavailable && date ? (
    <p
      className={styles.meta}
      role="status"
      aria-live="polite"
      aria-label="Last confirmed date, current timetable unavailable"
    >
      Last confirmed date: <time dateTime={date}>{formatLusaka(date)}</time>.
      Current timetable unavailable.
    </p>
  ) : null;
}

export function RefreshTimetable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={styles.secondaryButton}
      type="button"
      disabled={pending}
      aria-busy={pending}
      aria-live="polite"
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Checking…" : "Check again"}
    </button>
  );
}

export function RegisteredCourseView({
  data,
  publicationPending = true,
}: {
  data: Omit<TimetableAvailability, "publicationStatus">;
  publicationPending?: boolean;
}) {
  // Remount only when the authoritative programme/period changes. Filtering
  // and paging are presentation state; nothing is stored in browser storage.
  return (
    <CourseList
      key={`${data.attemptId ?? "current"}:${data.period}`}
      data={data}
      publicationPending={publicationPending}
    />
  );
}

function CourseList({
  data,
  publicationPending,
}: {
  data: Omit<TimetableAvailability, "publicationStatus">;
  publicationPending: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const courses = data.groups.flatMap((entry) =>
    entry.courses.map((course) => ({
      ...course,
      group: entry.semester,
    })),
  );
  const text = query.trim().toLocaleLowerCase("en");
  const filtered = courses.filter(
    (course) =>
      (!group || course.group === group) &&
      `${course.code} ${course.title}`.toLocaleLowerCase("en").includes(text),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * 10;
  const visible = filtered.slice(start, start + 10);
  const groups = [...new Set(data.groups.map((entry) => entry.semester))];

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>
            {publicationPending
              ? "Publication pending"
              : "Current registered-course source"}
          </p>
          <h2 id={`${id}-title`}>Registered courses</h2>
        </div>
        {publicationPending ? <RefreshTimetable /> : null}
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Academic period</dt>
          <dd>{data.period}</dd>
        </div>
        <div>
          <dt>Registered courses</dt>
          <dd>{courses.length}</dd>
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
      {courses.length > 0 ? (
        <>
          <div className={styles.filters}>
            <div>
              <label htmlFor={`${id}-search`}>Find a course</label>
              <input
                id={`${id}-search`}
                type="search"
                value={query}
                placeholder="Course code or title"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label htmlFor={`${id}-group`}>Course group</label>
              <select
                id={`${id}-group`}
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All groups</option>
                {groups.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p
            className={styles.meta}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {filtered.length
              ? `Showing ${start + 1}–${Math.min(start + 10, filtered.length)} of ${filtered.length} courses`
              : "No courses match these filters"}
          </p>
          {visible.length ? (
            <ul className={styles.courses} aria-label="Registered courses">
              {visible.map((course) => (
                <li
                  key={`${course.group}:${course.code}`}
                  className={styles.course}
                >
                  <p className={styles.courseName}>
                    <strong>{course.code}</strong> — {course.title}
                  </p>
                  <p className={styles.group}>
                    Course group <span>{course.group}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <p>
                No matching courses. Try another code or title, or clear the
                filters.
              </p>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setQuery("");
                  setGroup("");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {pages > 1 ? (
            <nav className={styles.pagination} aria-label="Course pages">
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous courses
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
                Next courses
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <div className={styles.empty}>
          <h3>No registered courses to display</h3>
          <p>
            The current registration source returned no course rows. Class
            times, rooms and meeting links remain unpublished.
          </p>
        </div>
      )}
      <p className={styles.footer}>
        {publicationPending
          ? "Class times, rooms and meeting links are displayed only after publication. "
          : "This list comes from your current registered courses. "}
        <Link href="/student/register">Registration</Link>
      </p>
    </section>
  );
}
