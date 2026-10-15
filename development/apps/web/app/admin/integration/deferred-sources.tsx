"use client";
import staffUi from "../staff-workspace.module.css";

import { useState } from "react";
import type { DeferredMoodleSourceView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "./deferred-sources.module.css";

const PAGE_SIZE = 10;
const PREVIEW_LIMIT = 100;
const occurredAt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lusaka",
});

/** Pages the bounded server preview, without implying access to additional work. */
export function DeferredSources({
  sources,
  truncated,
}: {
  sources: DeferredMoodleSourceView[];
  truncated: boolean;
}) {
  const [selectedPage, setSelectedPage] = useState(0);
  const count = Math.min(sources.length, PREVIEW_LIMIT);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  // A refreshed preview can shrink; keep the visible page in its new bounds.
  const page = Math.min(selectedPage, pages - 1);
  const offset = page * PAGE_SIZE;
  const visible = sources.slice(offset, Math.min(offset + PAGE_SIZE, count));

  if (count === 0)
    return <p className={staffUi.empty}>No deferred Moodle sources.</p>;
  return (
    <section className={styles.preview} aria-label="Waiting Moodle sources">
      {truncated || sources.length > PREVIEW_LIMIT ? (
        <Notice
          severity="info"
          title="Waiting queue preview"
          message="More waiting events are not shown."
        />
      ) : null}
      <p
        className={styles.reference}
        role="status"
        aria-label="Waiting event range"
      >
        {offset + 1}–{offset + visible.length} of {count} shown
      </p>
      <ul className={styles.sources} aria-label="Waiting Moodle events">
        {visible.map((source) => (
          <li key={source.outboxId} className={styles.source}>
            <strong>{source.eventType} · Waiting for setup</strong>
            <p className={styles.reference}>
              Source {source.outboxId} ·{" "}
              {occurredAt.format(new Date(source.occurredAt))} CAT
            </p>
            <p>{source.detail}</p>
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <nav className={styles.pagination} aria-label="Waiting event pages">
          <button
            className={staffUi.button}
            type="button"
            disabled={page === 0}
            onClick={() => setSelectedPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {pages}
          </span>
          <button
            className={staffUi.button}
            type="button"
            disabled={page === pages - 1}
            onClick={() => setSelectedPage(page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
