import { cookies } from "next/headers";
import Link from "next/link";
import type { ModerationCaseView } from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import { ModerationDecisionForm } from "../forms";
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

// Moderation case (TASK-PH7-004): frozen submission evidence plus the
// moderator decision form. The declaration the submitter signed travels
// with the case; decisions demand the reviewed version and, except for
// approvals, a recorded reason.
export default async function ModerationCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await loadStaff<ModerationCaseView>(`/moderation/${id}`);
  if (!res.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moderation case</h1>
          <Notice
            severity="warning"
            title="Case unavailable"
            message="This case needs moderation authority, or it does not exist in your lane."
            action={{ label: "Moderation queue", href: "/admin/assessment/moderation" }}
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
          Moderation case · {item.status}
        </h1>
        <p>
          <Link href="/admin/assessment/moderation">Moderation queue</Link> ·{" "}
          <Link href={`/admin/assessment/batches/${item.batchId}`}>
            Source batch
          </Link>
        </p>
        <Notice
          severity="info"
          title="Submission declaration"
          message={item.declaration}
        />
        <dl>
          <dt>Status</dt>
          <dd>
            <StatusChip
              tone={item.status === "APPROVED" ? "success" : "attention"}
            >
              {item.status}
            </StatusChip>
          </dd>
          <dt>Submitted</dt>
          <dd>{item.submittedAt}</dd>
          <dt>Reviewer</dt>
          <dd>{item.reviewer ?? "—"}</dd>
          <dt>Decision</dt>
          <dd>{item.decidedBy ?? "—"}</dd>
          <dt>Decision reason</dt>
          <dd>{item.decisionReason ?? "—"}</dd>
        </dl>
        <h2>Moderator decision</h2>
        <p>
          Only an assigned moderator who did not submit this batch may
          decide. Approval locks the batch and writes official CA
          records; returns come back with a reason for correction by
          new revision.
        </p>
        <ModerationDecisionForm caseId={item.id} version={item.version} />
      </main>
    </div>
  );
}
