import styles from "../../page.module.css";
import { CompareTable } from "@sis/ui";
import type { CompareColumn } from "@sis/ui";
import { Empty } from "@sis/ui";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import type { CompareResult } from "@sis/contracts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compare programmes",
  description:
    "Side-by-side differences for up to three programme offerings. Differences only; no programme is ranked.",
};

function statusText(status: string): string {
  if (status === "OPEN") return "Open for applications";
  if (status === "SOON") return "Opens soon";
  if (status === "RETIRED") return "No longer offered";
  return "Not currently open";
}

async function loadCompare(ids: string): Promise<CompareResult | null> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(
      `${api}/catalogue/compare?ids=${encodeURIComponent(ids)}`,
      // Reference data: cached per compared set for 5 minutes.
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as CompareResult;
  } catch {
    return null;
  }
}

function withoutId(ids: string, remove: string): string {
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id !== remove)
    .join(",");
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.ids;
  const ids = Array.isArray(raw) ? raw[0] ?? "" : (raw ?? "");
  if (!ids.trim()) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Compare programmes</h1>
          <Empty
            caseVariant="nothing"
            title="Nothing to compare"
            message="Choose up to three programmes to compare their differences."
            action={{ label: "Find a programme", href: "/discover" }}
          />
        </main>
      </div>
    );
  }
  const result = await loadCompare(ids);
  if (!result) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Compare programmes</h1>
          <Notice
            severity="error"
            title="Catalogue temporarily unavailable"
            message="The comparison cannot be shown right now. Try again or contact Admissions."
          />
        </main>
      </div>
    );
  }
  const columns: CompareColumn[] = result.items.map((item) => ({
    heading: item.programmeName,
    offeringId: item.offeringId,
    awardLevel: item.awardLevel,
    duration: item.duration,
    campusMode: `${item.campus} · ${item.studyMode}`,
    statusText: statusText(item.availability),
    deadlineText: item.deadline ? formatLusaka(item.deadline) : null,
    requirementsText: item.requirementSummary || "See programme page",
    additionalText: item.additionalSummary || null,
    versionText: `${item.publishedVersion}, updated ${item.lastUpdated.slice(0, 10)}`,
    feeRef: "Approved fee schedule",
    removeHref: `/discover/compare?ids=${encodeURIComponent(withoutId(ids, item.offeringId))}`,
    removeLabel: `Remove ${item.programmeName}`,
  }));
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Admissions · Public catalogue</p>
        <h1 className={styles.title}>Compare programmes</h1>
        <p className={styles.lede}>
          Differences only. No programme is ranked or recommended.
        </p>
        <CompareTable
          columns={columns}
          limitNote={
            result.truncated
              ? "Comparison holds at most three programmes. Extra selections were not included."
              : null
          }
        />
      </main>
    </div>
  );
}
