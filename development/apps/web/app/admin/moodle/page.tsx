import { cookies } from "next/headers";
import Link from "next/link";
import type { ConnectionView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";

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
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moodle administration</h1>
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
          message={`Provider ${health.data.provider}. SIS registration stays authoritative through every sync state.`}
        />
        <ul>
          <li>
            <Link href="/admin/moodle/mappings">Mappings</Link> — versioned
            course, user, role and group mappings.
          </li>
          <li>
            <Link href="/admin/integration/reconciliation">Reconciliation</Link>{" "}
            — expected-vs-actual runs and governed cases.
          </li>
          <li>
            <Link href="/admin/moodle/maintenance">Maintenance</Link> —
            scheduled windows with student-safe wording.
          </li>
        </ul>
        <h2>Course shells ({shells.data.items.length})</h2>
        {shells.data.items.length === 0 ? (
          <p>
            No shells yet. Shells provision from approved offerings when
            the first enrolment arrives, or provision one explicitly.
          </p>
        ) : (
          <ul>
            {shells.data.items.map((shell) => (
              <li key={shell.shellRef}>
                <strong>{shell.shellRef}</strong> —{" "}
                {shell.activeEnrolments} active enrolments
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
