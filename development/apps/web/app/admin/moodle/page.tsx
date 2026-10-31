import staffUi from "../staff-workspace.module.css";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ConnectionView } from "@sis/contracts";
import { DataTable, Notice, PageHeader } from "@sis/ui";
import { NavigationIcon } from "../../navigation-icon";
import { WriteReadinessNotice } from "./write-readiness";
import { moodleBackendLabel } from "../../../lib/moodle-status";
import styles from "../staff-workspace.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/integration${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// SCR-OPS-MOODLE-001 Moodle administration workspace: sync health,
// shells, enrolment state, mappings and maintenance. Configuration and
// governed sync only; official records are never edited here.
export default async function MoodleAdminPage() {
  const [health, shells] = await Promise.all([
    loadStaff<ConnectionView>("/health"),
    loadStaff<{
      items: Array<{ shellRef: string; activeEnrolments: number }>;
    }>("/shells"),
  ]);
  if (!health.ok || !shells.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Moodle administration"
            lede="Manage learning connections, mappings and scheduled maintenance. Official registration and results stay in SIS."
          />
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs Moodle administration authority. Sign in with a Moodle role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Moodle administration</h1>
        <Notice
          severity={health.data.status === "HEALTHY" ? "success" : "warning"}
          title={`Connection ${health.data.status}`}
          message={`Provider ${health.data.provider} · ${moodleBackendLabel(health.data.backend)}. SIS registration stays authoritative through every sync state.`}
        />
        <WriteReadinessNotice readiness={health.data.writeReadiness} />
        <nav className={staffUi.taskGrid} aria-label="Moodle tasks">
          {[
            {
              href: "/admin/moodle/live-run",
              title: "Connection setup",
              body: "Prepare and independently authorise a live demonstration.",
            },
            {
              href: "/admin/moodle/live-bindings",
              title: "Live course connections",
              body: "Connect registered courses and learners to Moodle.",
            },
            {
              href: "/admin/moodle/access",
              title: "Access",
              body: "Assign Moodle access to a student or a cohort.",
            },
            {
              href: "/admin/moodle/mappings",
              title: "Mappings",
              body: "Course, user, role and group connections.",
            },
            {
              href: "/admin/integration/reconciliation",
              title: "Reconciliation",
              body: "Compare expected enrolments and review differences.",
            },
            {
              href: "/admin/moodle/maintenance",
              title: "Maintenance",
              body: "Schedule service windows and learner guidance.",
            },
          ].map((task) => (
            <Link key={task.href} href={task.href} className={staffUi.taskLink}>
              <NavigationIcon href={task.href} />
              <strong>{task.title}</strong>
              <span>{task.body}</span>
            </Link>
          ))}
        </nav>
        <section className={staffUi.panel} aria-label="Recorded course shells">
          <h2 className={staffUi.sectionHeading}>
            Recorded simulator shells ({shells.data.items.length})
          </h2>
          {shells.data.items.length === 0 ? (
            <p className={staffUi.empty}>
              {health.data.writeReadiness?.outcome === "NOT_PROVISIONED"
                ? "No recorded simulator shells. SIS live provisioning is disabled until approved setup is complete."
                : "No simulator course shells yet. Approved offerings create simulated shells when the first enrolment arrives."}
            </p>
          ) : (
            <DataTable
              hideTitle
              title="Recorded simulator shells"
              description="Simulator records only. These counts do not certify live Moodle course delivery."
              columns={[
                {
                  heading: "Course reference",
                  render: (shell: {
                    shellRef: string;
                    activeEnrolments: number;
                  }) => shell.shellRef,
                },
                {
                  heading: "Active enrolments",
                  numeric: true,
                  render: (shell: {
                    shellRef: string;
                    activeEnrolments: number;
                  }) => shell.activeEnrolments,
                },
              ]}
              rows={shells.data.items}
              keyOf={(shell) => shell.shellRef}
              emptyText="No recorded simulator shells."
            />
          )}
        </section>
      </main>
    </div>
  );
}
