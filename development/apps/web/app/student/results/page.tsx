import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { OfficialResultView } from "@sis/contracts";
import { Card, Notice, PageHeader, StatusChip } from "@sis/ui";
import { StudentUnavailable } from "../chrome";
import styles from "../student.module.css";

export const dynamic = "force-dynamic";

// Read-only assessment fetch for students: loadStudent() targets the
// records module, so this page carries its own /assessment loader with
// the same cookie, no-store and sign-in-redirect discipline. The API
// resolves ownership server-side (Account → Person → Student) and
// returns only the caller's RELEASED rows.
async function loadOwnResults(): Promise<{
  data: { items: OfficialResultView[] } | null;
  message: string;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Fresults");
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  let response: Response;
  try {
    response = await fetch(`${api}/assessment/results/mine`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return {
      data: null,
      message:
        "We cannot reach the results service. Your record is kept. Try again shortly.",
    };
  }
  if (response.status === 401) redirect("/sign-in?returnTo=%2Fstudent%2Fresults");
  if (!response.ok) {
    return {
      data: null,
      message: "Your official results are unavailable right now.",
    };
  }
  return { data: (await response.json()) as { items: OfficialResultView[] }, message: "" };
}

// Student official results (TASK-PH7-006): only the caller's RELEASED
// rows, each labelled as an official released result. Anything else is
// a neutral "not yet released" state: provisional Moodle marks are
// never official, and board notes never leave the staff workspace.
export default async function StudentResultsPage() {
  const res = await loadOwnResults();
  if (!res.data) return <StudentUnavailable message={res.message} />;
  const items = res.data.items;
  return (
    <>
      <PageHeader
        eyebrow="Student portal"
        title="Official results"
        lede="Your officially released course results. Only published outcomes appear here."
      />
      <p>
        <Link href="/student">Back to student portal</Link>
      </p>
      {items.length === 0 ? (
        <Notice
          severity="info"
          title="No official results released yet"
          message="When the examinations office releases your official results, they appear here. Provisional Moodle marks are never official results."
        />
      ) : (
        <ul className={styles.history}>
          {items.map((item) => (
            <li key={`${item.offeringRef}-${item.periodCode}-${item.publishedAt}`}>
              <p>
                <strong>
                  {item.offeringRef} · {item.periodCode}
                </strong>{" "}
                <StatusChip tone="success">
                  Official result — released
                </StatusChip>
              </p>
              <p className={styles.meta}>
                Total {item.total} · {item.outcome} · published{" "}
                {item.publishedAt.slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Card title="About these results">
        <p className={styles.meta}>
          Released results are immutable official records. If you believe a
          result is wrong, contact the examinations office; corrections and
          appeals follow the published academic process.
        </p>
      </Card>
    </>
  );
}
