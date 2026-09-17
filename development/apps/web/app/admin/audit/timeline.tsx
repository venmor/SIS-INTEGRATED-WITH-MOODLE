"use client";

import { useState } from "react";
import type { AuditTimelineResponse, AuditTimelineRow } from "@sis/contracts";
import { Empty } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import styles from "../../page.module.css";

const TAKE = 20;

async function getJson(path: string): Promise<AuditTimelineResponse> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Audit lookup failed (${res.status}).`);
  return (await res.json()) as AuditTimelineResponse;
}

function humanize(row: AuditTimelineRow): string {
  const outcome = row.outcome === "ALLOW" ? "allowed" : "denied";
  return `${row.action} ${outcome}${row.reason ? ` — ${row.reason}` : ""}`;
}

export function AuditTimeline({ initial }: { initial: AuditTimelineResponse }) {
  const [events, setEvents] = useState<AuditTimelineRow[]>(initial.events);
  const [total, setTotal] = useState(initial.total);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function load(nextAction: string, nextPage: number) {
    setLoading(true);
    setFailure(null);
    try {
      const query = new URLSearchParams({
        take: String(TAKE),
        skip: String(nextPage * TAKE),
      });
      if (nextAction.trim()) query.set("action", nextAction.trim());
      const data = await getJson(`/api/auth/audit/timeline?${query}`);
      setEvents(data.events);
      setTotal(data.total);
      setAction(nextAction);
      setPage(nextPage);
    } catch {
      setFailure(
        "We could not refresh the audit trail. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Audit timeline">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load(action, 0);
        }}
      >
        <label htmlFor="audit-action">Filter by action</label>{" "}
        <input
          id="audit-action"
          name="action"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          maxLength={64}
        />{" "}
        <button type="submit" className={styles.primary}>
          Apply
        </button>
      </form>
      <p className={styles.supporting} role="status">
        {loading ? "Loading…" : `Showing ${events.length} of ${total}`}
      </p>
      {failure ? <p role="alert">{failure}</p> : null}
      {events.length === 0 && !loading ? (
        <Empty
          caseVariant="nothing"
          title="No audit entries"
          message="No records match your search in your current workspace and scope."
          action={{ label: "Back home", href: "/" }}
        />
      ) : (
        <ol>
          {events.map((row) => (
            <li key={row.id}>
              <strong>{humanize(row)}</strong>
              <br />
              <span>
                {formatLusaka(row.occurredAt)}
                {row.activeRole ? ` · ${row.activeRole}` : ""}
                {row.scope ? ` · ${row.scope}` : ""}
                {row.purpose ? ` · ${row.purpose}` : ""}
              </span>{" "}
              <details>
                <summary>Reference</summary>
                <code>{row.correlationId}</code>
              </details>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          aria-label={
            page === 0
              ? "Previous page (unavailable)"
              : `Previous page (page ${page})`
          }
          disabled={page === 0 || loading}
          onClick={() => void load(action, page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.primary}
          aria-label={`Next page (page ${page + 2})`}
          disabled={loading || (page + 1) * TAKE >= total}
          onClick={() => void load(action, page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
