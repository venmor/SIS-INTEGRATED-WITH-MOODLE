import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeMappingView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
import { MappingForms } from "./forms";
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
  if (status === "ACTIVE") return "success" as const;
  if (status === "TESTED" || status === "DRAFT") return "attention" as const;
  return "neutral" as const;
}

// Grade-activity mapping workspace: one Moodle activity binds one
// approved component (both SIS + Moodle identifiers). Synthetic tests
// write nothing; activation is four-eyes on a dedicated decision page.
export default async function GradeMappingsPage() {
  const list = await loadStaff<{ items: GradeMappingView[] }>("/mappings");
  if (!list.ok) {
    const restricted = list.status === 401 || list.status === 403;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Grade mappings</h1>
          <Notice
            severity="warning"
            title={restricted ? "Restricted area" : "Workspace unavailable"}
            message={
              restricted
                ? "Grade mappings need a lecturer, coordinator, Moodle administration or examinations workspace. Switch to one, or ask an administrator."
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
          title="Grade mappings"
          lede="Bind one Moodle activity to one approved component; test synthetically, then a second officer activates on a decision page."
        />
        <p>
          <Link href="/">Workspace home</Link> ·{" "}
          <Link href="/admin/assessment/plans">Assessment plans</Link>
        </p>
        <MappingForms />
        <h2>Mappings</h2>
        <DataTable
          hideTitle
          title="Grade mappings"
          description="Moodle activities bound to approved components with test and activation state."
          columns={[
            {
              heading: "Component",
              render: (item: GradeMappingView) => item.componentId,
            },
            {
              heading: "Activity",
              render: (item: GradeMappingView) => item.moodleActivityId,
            },
            {
              heading: "Course",
              render: (item: GradeMappingView) => item.moodleCourseRef,
            },
            {
              heading: "State",
              render: (item: GradeMappingView) => (
                <StatusChip tone={tone(item.status)}>{item.status}</StatusChip>
              ),
            },
            {
              heading: "Version",
              numeric: true,
              render: (item: GradeMappingView) => `v${item.version}`,
            },
            {
              heading: "Detail",
              render: (item: GradeMappingView) => (
                <span>
                  <Link href={`/admin/assessment/mappings/${item.id}`}>
                    Open mapping
                  </Link>{" "}
                  ·{" "}
                  <Link href={`/admin/assessment/mappings/${item.id}/decide`}>
                    Decide
                  </Link>
                </span>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No grade mappings yet."
        />
        {list.data.items.length > 0 ? (
          <ul>
            {list.data.items.map((item) => (
              <li key={item.id}>
                {item.moodleActivityId} ↔ {item.componentId} · {item.status} ·
                v{item.version} · ID {item.id}
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
