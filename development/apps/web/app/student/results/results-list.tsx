"use client";

import { useState } from "react";
import { Notice, StatusChip } from "@sis/ui";
import type { StudentResultsView } from "@sis/contracts";
import { formatLusaka } from "../../../lib/time";
import workflow from "../../components/workflow.module.css";
import study from "../study-workflows.module.css";
import styles from "./results.module.css";

type Result = StudentResultsView["items"][number];
const resultKey = (item: Result) => `${item.periodCode}:${item.courseCode}`;

/** Local navigation over the server-authorised own published-result projection. */
export function ResultsList({ items }: { items: StudentResultsView["items"] }) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const periods = [...new Set(items.map(item => item.periodCode))].sort((a, b) => b.localeCompare(a));
  const filtered = items.filter(item =>
    (!period || item.periodCode === period) &&
    `${item.courseCode} ${item.courseTitle}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => {
    const order = sort === "published" ? Date.parse(b.publishedAt) - Date.parse(a.publishedAt) :
      sort === "title" ? a.courseTitle.localeCompare(b.courseTitle) : a.courseCode.localeCompare(b.courseCode);
    return order || a.periodCode.localeCompare(b.periodCode) || a.courseCode.localeCompare(b.courseCode);
  });
  const take = 10;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / take) - 1));
  const visible = filtered.slice(currentPage * take, (currentPage + 1) * take);
  const detail = visible.find(item => resultKey(item) === selected);
  return <div className={study.page}>
    <section className={study.section} aria-labelledby="find-results-title">
      <h2 id="find-results-title">Find a released result</h2>
      <div className={workflow.toolbar}>
        <label>Search official results<input type="search" placeholder="Course code or title" value={query} onChange={event => { setQuery(event.target.value); setPage(0); setSelected(null); }} /></label>
        <label><span id="result-period-label">Academic period</span><select aria-labelledby="result-period-label" value={period} onChange={event => { setPeriod(event.target.value); setPage(0); setSelected(null); }}><option value="">All released periods</option>{periods.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span id="result-sort-label">Sort results</span><select aria-labelledby="result-sort-label" value={sort} onChange={event => { setSort(event.target.value); setPage(0); setSelected(null); }}><option value="code">Course code</option><option value="title">Course title</option><option value="published">Most recently published</option></select></label>
      </div>
      <p className={study.muted} role="status">{filtered.length ? `Showing ${currentPage * take + 1}–${Math.min((currentPage + 1) * take, filtered.length)} of ${filtered.length} results` : "0 results"}</p>
      {query || period ? <div className={study.actions}><button type="button" className={`${workflow.action} ${workflow.secondary}`} onClick={() => { setQuery(""); setPeriod(""); setPage(0); setSelected(null); }}>Clear result filters</button></div> : null}
    </section>
    {visible.length === 0 ? <Notice severity="info" title="No results match these filters" message="Clear or change the course search or academic period to see your other released results." /> :
      <section className={study.section} aria-labelledby="results-table-title">
        <h2 id="results-table-title">Official course results</h2>
        <div className={styles.tableScroll}><table className={styles.table}><caption>Released results for your selected academic period</caption><thead><tr><th scope="col">Course</th><th scope="col">Title</th><th scope="col">Period</th><th scope="col">Outcome</th><th scope="col">Mark</th><th scope="col">Details</th></tr></thead><tbody>{visible.map(item => <tr key={resultKey(item)}><th scope="row">{item.courseCode}</th><td>{item.courseTitle}</td><td>{item.periodCode}</td><td>{item.outcome.replaceAll("_", " ")}</td><td>{item.mark === null ? "Withheld by release policy" : `${item.mark} / 100`}</td><td><button type="button" className={styles.detailButton} aria-expanded={selected === resultKey(item)} aria-controls="selected-result" aria-label={selected === resultKey(item) ? `Close details for ${item.courseCode}` : `View details for ${item.courseCode}`} onClick={() => setSelected(selected === resultKey(item) ? null : resultKey(item))}>{selected === resultKey(item) ? "Close" : "View details"}</button></td></tr>)}</tbody></table></div>
      </section>}
    {detail ? <article id="selected-result" className={study.section} aria-label={`${detail.courseCode} · ${detail.courseTitle}`}>
      <header className={study.header}><div><p className={study.eyebrow}>{detail.periodCode} · {detail.courseType.replaceAll("_", " ")}</p><h2>{detail.courseCode} · {detail.courseTitle}</h2></div><StatusChip tone="success">Official result — released</StatusChip></header>
      <dl className={study.facts}><div><dt>Outcome</dt><dd>{detail.outcome.replaceAll("_", " ")}</dd></div><div><dt>Official mark</dt><dd>{detail.mark === null ? "Not displayed under the release policy" : `${detail.mark} / 100`}</dd></div><div><dt>Published</dt><dd><time dateTime={detail.publishedAt}>{formatLusaka(detail.publishedAt)}</time></dd></div><div><dt>Current version</dt><dd>{detail.version}</dd></div></dl>
      <Notice severity="info" title={detail.progressionReadiness === "REVIEW_REQUIRED" ? "Academic impact review required" : "Progression not yet evaluated"} message={detail.progressionReadiness === "REVIEW_REQUIRED" ? "This result was amended. The responsible academic team must review its effect on progression and registration. Your existing courses and learning access have not been removed by this amendment." : "This course result does not itself decide progression, supplementary eligibility or a repeat requirement."} />
      <section aria-label={`Result review for ${detail.courseCode}`}><h3>Result review</h3><p>{detail.reviewInstructions}</p></section>
      <details className={study.history}><summary>Published version history</summary><ol>{detail.history.map(version => <li key={version.version}>Version {version.version}: {version.outcome}{version.mark === null ? "" : ` · ${version.mark} / 100`} · {formatLusaka(version.publishedAt)} · {version.version === detail.version ? "Current" : "Superseded"}</li>)}</ol></details>
    </article> : null}
    {filtered.length > take ? <nav aria-label="Result pages" className={study.actions}><button type="button" className={`${workflow.action} ${workflow.secondary}`} disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelected(null); }}>Previous results</button><span className={study.muted}>Page {currentPage + 1} of {Math.ceil(filtered.length / take)}</span><button type="button" className={`${workflow.action} ${workflow.secondary}`} disabled={(currentPage + 1) * take >= filtered.length} onClick={() => { setPage(currentPage + 1); setSelected(null); }}>Next results</button></nav> : null}
  </div>;
}
