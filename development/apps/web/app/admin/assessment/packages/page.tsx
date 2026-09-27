import { cookies } from "next/headers";
import Link from "next/link";
import type { ResultPackageView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
import { AssemblePackageForm } from "./forms";
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
  if (status === "APPROVED_FOR_RELEASE") return "success" as const;
  if (status === "ASSEMBLED") return "attention" as const;
  return "neutral" as const;
}

// Board packages (TASK-PH7-005): frozen result packages awaiting a board
// decision. Assembly freezes approved CA refs, the weighted-total-v1
// preview, moderation refs and candidate reconciliation behind a hash;
// the board decides approve-for-release, return, clarify, condition,
// defer or refer. Nothing here releases results to students.
export default async function BoardPackagesPage() {
  const list = await loadStaff<{ items: ResultPackageView[] }>("/packages");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Board packages</h1>
          <Notice
            severity="warning"
            title={restricted ? "Restricted area" : "Workspace unavailable"}
            message={
              restricted
                ? "Board packages need a lecturer, coordinator, moderator or examinations workspace. Students see only published outcomes."
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
          title="Board packages"
          lede="Frozen result packages with integrity hashes awaiting a board decision. Approval for release never publishes to students; the official release is later work."
        />
        <p>
          <Link href="/">Workspace home</Link> ·{" "}
          <Link href="/admin/assessment/batches">Grade batches</Link> ·{" "}
          <Link href="/admin/assessment/moderation">Moderation queue</Link>
        </p>
        <AssemblePackageForm offeringRef="SWE-2026S1" periodCode="2026S1" />
        <h2>Packages</h2>
        <DataTable
          hideTitle
          title="Board packages"
          description="Assembled result packages with board outcomes."
          columns={[
            {
              heading: "State",
              render: (item: ResultPackageView) => (
                <StatusChip tone={tone(item.status)}>{item.status}</StatusChip>
              ),
            },
            {
              heading: "Version",
              render: (item: ResultPackageView) => String(item.version),
            },
            {
              heading: "Hash",
              render: (item: ResultPackageView) =>
                item.packageHash.slice(0, 12),
            },
            {
              heading: "Detail",
              render: (item: ResultPackageView) => (
                <Link href={`/admin/assessment/packages/${item.id}`}>
                  Open package
                </Link>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No board packages assembled yet."
        />
      </main>
    </div>
  );
}
