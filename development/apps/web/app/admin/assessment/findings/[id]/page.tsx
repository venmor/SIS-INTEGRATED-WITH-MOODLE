import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeFindingView } from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import { FindingTransitionForm } from "../forms";
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

// Finding detail (TASK-PH7-003): read-only evidence plus examinations
// triage. Resolving or dismissing demands a recorded reason and never
// edits staged marks — corrections stage a new batch revision.
export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await loadStaff<GradeFindingView>(`/findings/${id}`);
  if (!res.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Validation finding</h1>
          <Notice
            severity="warning"
            title="Finding unavailable"
            message="This finding needs queue authority, or it does not exist in your lane."
            action={{ label: "Validation queue", href: "/admin/assessment/findings" }}
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
          Finding · {item.code}
        </h1>
        <p>
          <Link href="/admin/assessment/findings">Validation queue</Link> ·{" "}
          <Link href={`/admin/assessment/batches/${item.batchId}`}>
            Source batch
          </Link>
        </p>
        <dl>
          <dt>Code</dt>
          <dd>{item.code}</dd>
          <dt>Lane</dt>
          <dd>{item.lane}</dd>
          <dt>Status</dt>
          <dd>
            <StatusChip tone={item.status === "OPEN" ? "attention" : "neutral"}>
              {item.status}
            </StatusChip>
          </dd>
          <dt>Owner</dt>
          <dd>{item.ownerUnit ?? "—"}</dd>
          <dt>Escalation deadline</dt>
          <dd>{item.escalationDeadline ?? "—"}</dd>
          <dt>Recorded</dt>
          <dd>{item.createdAt}</dd>
        </dl>
        <h2>Examinations triage</h2>
        <p>
          Acknowledging, resolving or dismissing records a queue decision
          only. Staged marks stay exactly as captured.
        </p>
        <FindingTransitionForm findingId={item.id} version={item.version} />
      </main>
    </div>
  );
}
