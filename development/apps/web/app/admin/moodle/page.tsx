import { cookies } from "next/headers";
import Link from "next/link";
import type { ConnectionView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { moodleBackendLabel } from "../integration/backend-label";
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

interface DeliveryItem {
  id: string;
  eventType: string;
  state: string;
  attempt: number;
  lastError: string | null;
  createdAt: string;
}

// SCR-OPS-MOODLE-001 Moodle administration workspace: sync health,
// shells, enrolment state, mappings and maintenance. Configuration and
// governed sync only; official records are never edited here.
export default async function MoodleAdminPage() {
  const [health, shells, deliveries] = await Promise.all([
    loadStaff<ConnectionView>("/health"),
    loadStaff<{
      items: Array<{ shellRef: string; activeEnrolments: number }>;
    }>("/shells"),
    loadStaff<{ items: DeliveryItem[] }>("/deliveries"),
  ]);
  if (!health.ok || !shells.ok || !deliveries.ok)
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

  const backendLabel = moodleBackendLabel(health.data.backend);
  const attention = deliveries.data.items.filter((item) =>
    ["DEAD_LETTER", "MANUAL_REVIEW"].includes(item.state),
  );
  const recentError = deliveries.data.items.find((item) => item.lastError);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Moodle administration</h1>
        <p className={styles.lede}>
          Monitor Moodle delivery while SIS remains the authoritative source
          for registration, teaching and student records.
        </p>

        <section className={styles.section} aria-label="Needs attention">
          <h2>Needs attention</h2>
          {attention.length === 0 && health.data.status === "HEALTHY" ? (
            <p>No Moodle delivery failures need action in this view.</p>
          ) : (
            <ul>
              {health.data.status !== "HEALTHY" ? (
                <li>Connection state: {health.data.status}.</li>
              ) : null}
              {attention.slice(0, 5).map((item) => (
                <li key={item.id}>
                  {item.eventType} · {item.state} · attempt {item.attempt}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-label="Health and freshness">
          <h2>Health and freshness</h2>
          <Notice
            severity={health.data.status === "HEALTHY" ? "success" : "warning"}
            title={`Connection ${health.data.status}`}
            message={`${backendLabel}${health.data.version ? ` · version ${health.data.version}` : ""}. SIS registration stays authoritative through every sync state.`}
          />
          <p className={styles.supporting}>
            Last checked: {health.data.lastCheckedAt ?? "Not recorded yet"}.
          </p>
        </section>

        <section
          className={styles.section}
          aria-label="Deliveries and reconciliation"
        >
          <h2>Deliveries and reconciliation</h2>
          <p>
            {deliveries.data.items.length} recent delivery attempt
            {deliveries.data.items.length === 1 ? "" : "s"} recorded.
          </p>
          <p className={styles.actions}>
            <Link href="/admin/moodle/mappings">Mappings</Link>
            <Link href="/admin/integration/reconciliation">Reconciliation</Link>
            <Link href="/admin/moodle/maintenance">Maintenance</Link>
          </p>
        </section>

        <section
          className={styles.section}
          aria-label="Recent incident evidence"
        >
          <h2>Recent incident evidence</h2>
          {recentError ? (
            <p>
              {recentError.eventType} · {recentError.state}:{" "}
              {recentError.lastError}
            </p>
          ) : (
            <p>No recent Moodle delivery error is recorded in this view.</p>
          )}
          <p className={styles.supporting}>
            Integration Support owns incident closure and replay approval;
            this workspace exposes delivery evidence without disclosing
            support-only incident controls.
          </p>
        </section>

        <section className={styles.section} aria-label="Course shells">
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
        </section>
      </main>
    </div>
  );
}
