"use client";

import { useState } from "react";
import type { ReviewSchedule } from "@sis/contracts";
import { Empty } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import styles from "../../page.module.css";

async function getJson(path: string): Promise<ReviewSchedule[]> {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Reviews lookup failed (${res.status}).`);
  return (await res.json()) as ReviewSchedule[];
}

function short(id: string): string {
  return id.slice(0, 8);
}

export function ReviewQueue({ initial }: { initial: ReviewSchedule[] }) {
  const [rows, setRows] = useState<ReviewSchedule[]>(initial.slice(0, 20));
  const [hasMore, setHasMore] = useState(initial.length > 20);
  const [riskLevel, setRiskLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function applyFilter(nextRisk: string) {
    setRiskLevel(nextRisk);
    setLoading(true);
    setFailure(null);
    try {
      // Over-fetch by one (no API change): a 21st row means more exist.
      const query = new URLSearchParams({ status: "pending", take: "21" });
      if (nextRisk) query.set("riskLevel", nextRisk);
      const fetched = await getJson(`/api/auth/reviews?${query}`);
      setHasMore(fetched.length > 20);
      setRows(fetched.slice(0, 20));
    } catch {
      setFailure(
        "We could not refresh the review queue. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Pending access reviews">
      <p className={styles.supporting} role="status">
        {loading
          ? "Loading…"
          : `Showing ${rows.length}${hasMore ? " (more available — refine filters)" : ""}`}
      </p>
      <div
        className={styles.actions}
        role="group"
        aria-label="Filter by risk level"
      >
        {["", "high", "medium", "low"].map((level) => (
          <button
            key={level || "all"}
            type="button"
            className={styles.primary}
            aria-pressed={riskLevel === level}
            onClick={() => void applyFilter(level)}
          >
            {level === "" ? "All levels" : level}
          </button>
        ))}
      </div>
      {failure ? <p role="alert">{failure}</p> : null}
      {rows.length === 0 && !loading ? (
        <Empty
          caseVariant="nothing"
          title="No reviews due"
          message="No pending reviews match these filters. Quarterly scheduling creates the next batch."
          action={{ label: "Back home", href: "/" }}
        />
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <strong>
                {row.riskLevel} risk · {short(row.assignmentId)}
              </strong>{" "}
              <span>due {formatLusaka(row.nextDueAt)}</span>{" "}
              <a href={`/admin/reviews/${row.id}`}>Review</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
