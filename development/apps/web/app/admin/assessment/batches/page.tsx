import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeBatchView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
import { BatchForms } from "./forms";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/assessment${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

function tone(status: string) {
  if (status === "VALIDATED") return "success" as const;
  if (status === "RECEIVED") return "attention" as const;
  return "neutral" as const;
}

// Lecturer grade-batch workspace: immutable staging snapshots per ACTIVE
// mapping + source revision. Staging never makes results official; invalid
// lines are quarantined with flags while valid lines are preserved.
export default async function GradeBatchesPage() {
  const list = await loadStaff<{ items: GradeBatchView[] }>("/batches");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Grade batches</h1>
          <Notice
            severity="warning"
            title={restricted ? "Restricted area" : "Workspace unavailable"}
            message={
              restricted
                ? "Grade batches need a lecturer, coordinator, Moodle administration or examinations workspace. Switch to one, or ask an administrator."
                : "We could not reach the assessment service. Drafts are kept. Try again shortly."
            }
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          eyebrow="Student Information System"
          title="Grade batches"
          lede="Lecturers stage provisional Moodle marks per active mapping and source revision. Staging is a frozen snapshot — it never publishes official results."
        />
        <p>
          <Link href="/">Workspace home</Link> ·{" "}
          <Link href="/admin/assessment/plans">Assessment plans</Link> ·{" "}
          <Link href="/admin/assessment/mappings">Grade mappings</Link>
        </p>
        <BatchForms />
        <h2>Batches</h2>
        <DataTable
          hideTitle
          title="Grade batches"
          description="Immutable staging snapshots with quarantine flags."
          columns={[
            {
              heading: "Revision",
              render: (item: GradeBatchView) => item.sourceRevision,
            },
            {
              heading: "State",
              render: (item: GradeBatchView) => (
                <StatusChip tone={tone(item.status)}>{item.status}</StatusChip>
              ),
            },
            {
              heading: "Lines",
              numeric: true,
              render: (item: GradeBatchView) => `${item.lines.length}`,
            },
            {
              heading: "Quarantined",
              numeric: true,
              render: (item: GradeBatchView) =>
                `${item.lines.filter((l) => l.status !== "STAGED").length}`,
            },
            {
              heading: "Detail",
              render: (item: GradeBatchView) => (
                <Link href={`/admin/assessment/batches/${item.id}`}>
                  Open batch
                </Link>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No grade batches yet."
        />
        {list.data.items.length > 0 ? (
          <ul>
            {list.data.items.map((item) => (
              <li key={item.id}>
                {item.sourceRevision} · {item.status} · ID {item.id}
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
