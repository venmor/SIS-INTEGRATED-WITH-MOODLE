import { cookies } from "next/headers";
import type { AssessmentPlanListView } from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { AssessmentRegistry } from "../registry";
import { PlanForms } from "./forms";
import styles from "../workspace.module.css";

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

// Lecturer/coordinator assessment-plan workspace: versioned scheme
// registry per offering+period (DRAFT→APPROVED; approval supersedes,
// never edits). Lecturers draft inside their offering scope;
// coordinators approve on a dedicated decision page (four-eyes).
export default async function AssessmentPlansPage() {
  const list = await loadStaff<AssessmentPlanListView>("/plans");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Assessment plans"
          />
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
        <PlanForms canDraft={list.data.canDraft === true} />
        <AssessmentRegistry kind="plans" items={list.data.items} />
      </main>
    </div>
  );
}
