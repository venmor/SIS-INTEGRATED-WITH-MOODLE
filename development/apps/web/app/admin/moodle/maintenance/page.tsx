import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import { MaintenanceForms } from "./forms";
import styles from "../../../page.module.css";

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

interface WindowItem {
  id: string;
  reason: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

// Moodle maintenance: approved windows defer deliveries; health reports
// MAINTENANCE with student-safe wording while one is active.
export default async function MaintenancePage() {
  const list = await loadStaff<{ items: WindowItem[] }>("/maintenance");
  if (!list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moodle maintenance</h1>
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
        <h1 className={styles.title}>Moodle maintenance</h1>
        <p>
          <Link href="/admin/moodle">Moodle administration</Link>
        </p>

        <section className={styles.section} aria-label="Maintenance impact">
          <h2>Maintenance impact</h2>
          <p>
            Scheduled maintenance affects Moodle delivery only. SIS
            registration remains authoritative while queued Moodle work is
            deferred until the active window ends.
          </p>
          <p className={styles.supporting}>
            Students keep their SIS registration state during a Moodle
            maintenance window; delayed destination access is reported as a
            sync state, not as a registration failure.
          </p>
        </section>

        <section className={styles.section} aria-label="Scheduled windows">
          <h2>Scheduled windows</h2>
          {list.data.items.length === 0 ? (
            <p>No maintenance windows scheduled.</p>
          ) : (
            <ul>
              {list.data.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.reason}</strong> — {item.status} ·{" "}
                  {item.startsAt} → {item.endsAt}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-label="Maintenance actions">
          <h2>Maintenance actions</h2>
          <MaintenanceForms />
        </section>
      </main>
    </div>
  );
}
