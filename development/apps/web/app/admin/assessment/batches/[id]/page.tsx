import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeBatchView } from "@sis/contracts";
import { DataTable, Notice, StatusChip } from "@sis/ui";
import styles from "../../../../page.module.css";

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
  if (status === "STAGED") return "success" as const;
  return "attention" as const;
}

// Batch detail: frozen snapshot lines with quarantine flags. Quarantined
// lines stay visible as evidence; nothing here edits marks or publishes
// results — validation and later workflows own those decisions.
export default async function GradeBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await loadStaff<GradeBatchView>(`/batches/${id}`);
  if (!res.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Grade batch</h1>
          <Notice
            severity="warning"
            title="Batch unavailable"
            message="This batch needs assessment authority, or it does not exist in your scope."
            action={{ label: "Grade batches", href: "/admin/assessment/batches" }}
          />
        </main>
      </div>
    );
  const item = res.data;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Grade batch · {item.status}
        </h1>
        <p>
          <Link href="/admin/assessment/batches">Grade batches</Link>
        </p>
        <Notice
          severity="info"
          title="Frozen staging snapshot"
          message={`Revision ${item.sourceRevision} · version v${item.version}. This snapshot never changes; corrections stage a new revision instead.`}
        />
        <dl>
          <dt>Mapping ID</dt>
          <dd>{item.mappingId}</dd>
          <dt>Source revision</dt>
          <dd>{item.sourceRevision}</dd>
          <dt>Status</dt>
          <dd>
            <StatusChip tone={item.status === "VALIDATED" ? "success" : "attention"}>
              {item.status}
            </StatusChip>
          </dd>
        </dl>
        <h2>Lines</h2>
        <DataTable
          hideTitle
          title="Batch lines"
          description="Staged marks with quarantine flags."
          columns={[
            {
              heading: "Student",
              render: (line: GradeBatchView["lines"][number]) =>
                line.studentRef,
            },
            {
              heading: "Raw mark",
              numeric: true,
              render: (line: GradeBatchView["lines"][number]) =>
                line.rawValue == null ? "—" : `${line.rawValue}`,
            },
            {
              heading: "Outcome",
              render: (line: GradeBatchView["lines"][number]) => line.outcome,
            },
            {
              heading: "State",
              render: (line: GradeBatchView["lines"][number]) => (
                <StatusChip tone={tone(line.status)}>{line.status}</StatusChip>
              ),
            },
            {
              heading: "Flag",
              render: (line: GradeBatchView["lines"][number]) =>
                line.flagCode ?? "—",
            },
          ]}
          rows={item.lines}
          keyOf={(line) => line.id}
          emptyText="No lines in this batch."
        />
      </main>
    </div>
  );
}
