"use client";

import { useState } from "react";
import { Notice, StatusChip } from "@sis/ui";
import type { StudentResultsView } from "@sis/contracts";
import { formatLusaka } from "../../../lib/time";
import workflow from "../../components/workflow.module.css";
import study from "../study-workflows.module.css";
import styles from "./results.module.css";

/** Local navigation over the server-authorised own published-result projection. */
export function ResultsList({ items }: { items: StudentResultsView["items"] }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [sort, setSort] = useState("published");
  const [page, setPage] = useState(0);
  const periods = [...new Set(items.map((item) => item.periodCode))].sort(
    (a, b) => b.localeCompare(a),
  );
  const filtered = items
    .filter(
      (item) =>
        (!period || item.periodCode === period) &&
        `${item.courseCode} ${item.courseTitle}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      const order =
        sort === "code"
          ? a.courseCode.localeCompare(b.courseCode)
          : sort === "title"
            ? a.courseTitle.localeCompare(b.courseTitle)
            : Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      return (
        order ||
        a.courseCode.localeCompare(b.courseCode) ||
        a.periodCode.localeCompare(b.periodCode)
      );
    });
  const take = 10;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / take) - 1),
  );
  const visible = filtered.slice(currentPage * take, (currentPage + 1) * take);
  return (
    <div className={study.page}>
      <section className={study.section} aria-labelledby="find-results-title">
        <h2 id="find-results-title">Find a released result</h2>
        <div className={workflow.toolbar}>
          <label>
            Search official results
            <input
              type="search"
              placeholder="Course code or title"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            <span id="result-period-label">Academic period</span>
            <select
              aria-labelledby="result-period-label"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setPage(0);
              }}
            >
              <option value="">All released periods</option>
              {periods.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span id="result-sort-label">Sort official results</span>
            <select
              aria-labelledby="result-sort-label"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(0);
              }}
            >
              <option value="published">Most recently published</option>
              <option value="code">Course code</option>
              <option value="title">Course title</option>
            </select>
          </label>
        </div>
        <p className={study.muted} role="status">
          {filtered.length
            ? `Showing ${currentPage * take + 1}–${Math.min((currentPage + 1) * take, filtered.length)} of ${filtered.length} results`
            : "0 results"}
        </p>
        {query || period ? (
          <div className={study.actions}>
            <button
              type="button"
              className={`${workflow.action} ${workflow.secondary}`}
              onClick={() => {
                setQuery("");
                setPeriod("");
                setPage(0);
              }}
            >
              Clear result filters
            </button>
          </div>
        ) : null}
      </section>
      {visible.length === 0 ? (
        <Notice
          severity="info"
          title="No results match these filters"
          message="Clear or change the course search or academic period to see your other released results."
        />
      ) : null}
      <div className={styles.list}>
        {visible.map((item) => (
          <article
            key={`${item.courseCode}-${item.periodCode}`}
            className={study.section}
            aria-label={`${item.courseCode} · ${item.courseTitle}`}
          >
            <header className={study.header}>
              <div>
                <p className={study.eyebrow}>
                  {item.periodCode} · {item.courseType.replaceAll("_", " ")}
                </p>
                <h2>
                  {item.courseCode} · {item.courseTitle}
                </h2>
              </div>
              <StatusChip tone="success">Official result — released</StatusChip>
            </header>
            <dl className={study.facts}>
              <div>
                <dt>Outcome</dt>
                <dd>{item.outcome.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Official mark</dt>
                <dd>
                  {item.mark === null
                    ? "Not displayed under the release policy"
                    : `${item.mark} / 100`}
                </dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd>
                  <time dateTime={item.publishedAt}>
                    {formatLusaka(item.publishedAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Current version</dt>
                <dd>{item.version}</dd>
              </div>
            </dl>
            <Notice
              severity="info"
              title={
                item.progressionReadiness === "REVIEW_REQUIRED"
                  ? "Academic impact review required"
                  : "Progression not yet evaluated"
              }
              message={
                item.progressionReadiness === "REVIEW_REQUIRED"
                  ? "This result was amended. The responsible academic team must review its effect on progression and registration. Your existing courses and learning access have not been removed by this amendment."
                  : "This course result does not itself decide progression, supplementary eligibility or a repeat requirement."
              }
            />
            <section aria-label={`Result review for ${item.courseCode}`}>
              <h3>Result review</h3>
              <p>{item.reviewInstructions}</p>
            </section>
            <details className={study.history}>
              <summary>Published version history</summary>
              <ol>
                {item.history.map((version) => (
                  <li key={version.version}>
                    Version {version.version}: {version.outcome}
                    {version.mark === null
                      ? ""
                      : ` · ${version.mark} / 100`} ·{" "}
                    {formatLusaka(version.publishedAt)} ·{" "}
                    {version.version === item.version
                      ? "Current"
                      : "Superseded"}
                  </li>
                ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
      {filtered.length > take ? (
        <nav aria-label="Result pages" className={study.actions}>
          <button
            type="button"
            className={`${workflow.action} ${workflow.secondary}`}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous results
          </button>
          <span className={study.muted}>
            Page {currentPage + 1} of {Math.ceil(filtered.length / take)}
          </span>
          <button
            type="button"
            className={`${workflow.action} ${workflow.secondary}`}
            disabled={(currentPage + 1) * take >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Next results
          </button>
        </nav>
      ) : null}
    </div>
  );
}
