import { cookies } from "next/headers";
import type { GradeBatchListView } from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { AssessmentRegistry } from "../registry";
import { BatchForms } from "./forms";
import { MoodleImportForm } from "./moodle-import";
import type { GradeMappingView } from "@sis/contracts";
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

// Lecturer grade-batch workspace: immutable staging snapshots per ACTIVE
// mapping + source revision. Staging never makes results official; invalid
// lines are quarantined with flags while valid lines are preserved.
export default async function GradeBatchesPage() {
  const list = await loadStaff<GradeBatchListView>("/batches");
  const mappings =
    list.ok && list.data.canStage === true
      ? await loadStaff<{ items: GradeMappingView[] }>("/mappings")
      : null;
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Grade batches"
          />
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
        {list.data.canStage === true ? (
          <MoodleImportForm
            mappings={
              mappings?.ok
                ? mappings.data.items.filter(
                    (m) =>
                      m.status === "ACTIVE" &&
                      /^[1-9][0-9]*$/.test(m.moodleCourseRef),
                  )
                : []
            }
          />
        ) : null}
        <BatchForms canStage={list.data.canStage === true} />
        <AssessmentRegistry kind="batches" items={list.data.items} />
      </main>
    </div>
  );
}
