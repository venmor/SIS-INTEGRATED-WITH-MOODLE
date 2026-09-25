import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeFindingView } from "@sis/contracts";
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
  if (status === "OPEN") return "attention" as const;
  if (status === "ACKNOWLEDGED") return "neutral" as const;
  return "success" as const;
}

// Validation queue (TASK-PH7-003): immutable findings per staged batch.
// Each workspace sees only its swimlane — technical mapping errors for
// Moodle administration, academic findings for lecturers/coordinators,
// enrolment truth for Registry via the operating examinations office.
// Examinations operates the queue but corrects nothing: corrections
// stage a new batch revision instead.
export default async function ValidationQueuePage() {
  const list = await loadStaff<{ items: GradeFindingView[] }>("/findings");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Validation queue</h1>
          <Notice
            severity="warning"
            title={restricted ? "Restricted area" : "Workspace unavailable"}
            message={
              restricted
                ? "The validation queue needs a lecturer, coordinator, Moodle administration or examinations workspace. Students see only published outcomes."
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
          title="Validation queue"
          lede="Your swimlane only: technical mapping errors, academic findings, or enrolment truth. Findings are evidence — resolving one never edits staged marks."
        />
        <p>
          <Link href="/">Workspace home</Link> ·{" "}
          <Link href="/admin/assessment/batches">Grade batches</Link>
        </p>
        <h2>Findings</h2>
        <DataTable
          hideTitle
          title="Validation findings"
          description="Immutable validation findings with owning units and escalation deadlines."
          columns={[
            {
              heading: "Code",
              render: (item: GradeFindingView) => item.code,
            },
            {
              heading: "Lane",
              render: (item: GradeFindingView) => item.lane,
            },
            {
              heading: "State",
              render: (item: GradeFindingView) => (
                <StatusChip tone={tone(item.status)}>{item.status}</StatusChip>
              ),
            },
            {
              heading: "Owner",
              render: (item: GradeFindingView) => item.ownerUnit ?? "—",
            },
            {
              heading: "Detail",
              render: (item: GradeFindingView) => (
                <Link href={`/admin/assessment/findings/${item.id}`}>
                  Open finding
                </Link>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No findings in your lane."
        />
      </main>
    </div>
  );
}
