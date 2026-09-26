import { cookies } from "next/headers";
import Link from "next/link";
import type { ModerationCaseView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
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
  if (status === "APPROVED") return "success" as const;
  if (status === "SUBMITTED" || status === "UNDER_MODERATION")
    return "attention" as const;
  return "neutral" as const;
}

// Moderation queue (TASK-PH7-004): submitted batches awaiting an
// independent moderator. Moderators see their offering scope,
// examinations sees referred cases, submitters see their own.
// Deciding never edits staged marks; corrections stage new revisions.
export default async function ModerationQueuePage() {
  const list = await loadStaff<{ items: ModerationCaseView[] }>("/moderation");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moderation queue</h1>
          <Notice
            severity="warning"
            title={restricted ? "Restricted area" : "Workspace unavailable"}
            message={
              restricted
                ? "The moderation queue needs a lecturer, coordinator, moderator or examinations workspace. Students see only published outcomes."
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
          title="Moderation queue"
          lede="Validated batches awaiting an independent moderator. Approval locks the batch and writes official CA records; returns come back with a reason for correction by new revision."
        />
        <p>
          <Link href="/">Workspace home</Link> ·{" "}
          <Link href="/admin/assessment/batches">Grade batches</Link>
        </p>
        <h2>Cases</h2>
        <DataTable
          hideTitle
          title="Moderation cases"
          description="Submitted batches with moderation outcomes."
          columns={[
            {
              heading: "State",
              render: (item: ModerationCaseView) => (
                <StatusChip tone={tone(item.status)}>{item.status}</StatusChip>
              ),
            },
            {
              heading: "Submitted",
              render: (item: ModerationCaseView) => item.submittedAt.slice(0, 10),
            },
            {
              heading: "Detail",
              render: (item: ModerationCaseView) => (
                <Link href={`/admin/assessment/moderation/${item.id}`}>
                  Open case
                </Link>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No moderation cases in your lane."
        />
      </main>
    </div>
  );
}
