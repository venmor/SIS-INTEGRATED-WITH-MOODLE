"use client";

import { useState } from "react";
import type { CoursePlanView } from "@sis/contracts";
import styles from "../../components/workflow.module.css";

type Course = CoursePlanView["available"][number];
/** Filters the already-authorised inventory, without changing the saved plan. */
export function CourseSelection({
  title,
  courses,
  selected,
  validation,
  onToggle,
  disabled,
}: {
  title: string;
  courses: Course[];
  selected: Set<string>;
  validation: CoursePlanView["validation"];
  onToggle: (code: string) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(0);
  const filtered = courses
    .filter((course) =>
      `${course.code} ${course.title}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "credits"
          ? a.credits - b.credits || a.code.localeCompare(b.code)
          : a.code.localeCompare(b.code),
    );
  const take = 10;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / take) - 1),
  );
  const visible = filtered.slice(currentPage * take, (currentPage + 1) * take);
  return (
    <section className={styles.panel} aria-label={title}>
      <div className={styles.panelHeader}>
        <h2>{title}</h2>
        <p className={styles.meta}>
          {courses.filter((course) => selected.has(course.code)).length}{" "}
          selected
        </p>
      </div>
      <div className={styles.toolbar}>
        <label>
          Search {title.toLowerCase()}
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Course code or title"
          />
        </label>
        <label>
          Sort {title.toLowerCase()}
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(0);
            }}
          >
            <option value="code">Course code</option>
            <option value="title">Course title</option>
            <option value="credits">Credits, low to high</option>
          </select>
        </label>
      </div>
      {visible.length === 0 ? (
        <p className={styles.meta}>
          {courses.length === 0
            ? `No ${title.toLowerCase()} configured.`
            : "No courses match this search. Clear or change the search."}
        </p>
      ) : (
        <table className={styles.table}>
          <caption>{title} · available plan inventory</caption>
          <thead>
            <tr>
              <th scope="col">Select course</th>
              <th scope="col">Study load</th>
              <th scope="col">Last saved check</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((course) => {
              const check = validation.find(
                (item) => item.code === course.code,
              );
              return (
                <tr key={course.code}>
                  <th scope="row">
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={selected.has(course.code)}
                        disabled={disabled}
                        onChange={() => onToggle(course.code)}
                      />
                      <span>
                        {course.code} — {course.title}
                      </span>
                    </label>
                  </th>
                  <td data-label="Study load">
                    {course.credits} credits · {course.courseType}
                    {course.semester ? ` · ${course.semester}` : ""}
                    <div className={styles.meta}>
                      Capacity {course.capacity}
                      {course.seatsRemaining == null
                        ? " · Available places not confirmed"
                        : ` · ${course.seatsRemaining} places available`}
                    </div>
                  </td>
                  <td data-label="Last saved check">
                    {check
                      ? `${check.result.replaceAll("_", " ")}: ${check.explanation}`
                      : "Save the plan to check this course."}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className={styles.panelHeader}>
        <p className={styles.meta} role="status">
          {filtered.length === 0
            ? "0 courses"
            : `Showing ${currentPage * take + 1}–${Math.min((currentPage + 1) * take, filtered.length)} of ${filtered.length}`}
        </p>
        {filtered.length > take ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.action} ${styles.secondary}`}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous {title.toLowerCase()}
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.secondary}`}
              disabled={(currentPage + 1) * take >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              Next {title.toLowerCase()}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
