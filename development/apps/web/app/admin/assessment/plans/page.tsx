import { cookies } from "next/headers";
import Link from "next/link";
import type { AssessmentPlanView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
import { PlanForms } from "./forms";
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
  if (status === "DRAFT") return "attention" as const;
  return "neutral" as const;
}

// Lecturer/coordinator assessment-plan workspace: versioned scheme
// registry per offering+period (DRAFT→APPROVED; approval supersedes,
// never edits). Lecturers draft inside their offering scope;
// coordinators approve on a dedicated decision page (four-eyes).
export default async function AssessmentPlansPage() {
  const list = await loadStaff<{ items: AssessmentPlanView[] }>("/plans");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Assessment plans</h1>
          <Notice
            severity="warning"
            title={restricted ? "Restricted area" : "Workspace unavailable"}
            message={
              restricted
                ? "Assessment plans need a lecturer, coordinator, Moodle administration or examinations workspace. Switch to one, or ask an administrator."
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
          title="Assessment plans"
          lede="Lecturers draft versioned schemes per offering and period; a second officer approves on a decision page — creators never self-approve."
        />
        <p>
          <Link href="/">Workspace home</Link> ·{" "}
          <Link href="/admin/assessment/mappings">Grade mappings</Link>
        </p>
        <PlanForms />
        <h2>Plans</h2>
        <DataTable
          hideTitle
          title="Assessment plans"
          description="Versioned assessment schemes with components, weights and approval state."
          columns={[
            {
              heading: "Offering",
              render: (item: AssessmentPlanView) => item.offeringRef,
            },
            {
              heading: "Period",
              render: (item: AssessmentPlanView) => item.periodCode,
            },
            {
              heading: "Version",
              numeric: true,
              render: (item: AssessmentPlanView) => `v${item.version}`,
            },
            {
              heading: "State",
              render: (item: AssessmentPlanView) => (
                <StatusChip tone={tone(item.status)}>{item.status}</StatusChip>
              ),
            },
            {
              heading: "Policy",
              render: (item: AssessmentPlanView) => item.policyVersion,
            },
            {
              heading: "Detail",
              render: (item: AssessmentPlanView) => (
                <span>
                  <Link href={`/admin/assessment/plans/${item.id}`}>
                    Open plan
                  </Link>{" "}
                  ·{" "}
                  <Link href={`/admin/assessment/plans/${item.id}/decide`}>
                    Decide
                  </Link>
                </span>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No assessment plans yet."
        />
        {list.data.items.length > 0 ? (
          <ul>
            {list.data.items.map((item) => (
              <li key={item.id}>
                {item.offeringRef} {item.periodCode} v{item.version} ·{" "}
                {item.status} · ID {item.id}
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
