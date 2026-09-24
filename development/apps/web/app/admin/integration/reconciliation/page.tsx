import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import { ReconForms } from "./forms";
import { moodleBackendLabel } from "../backend-label";
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

interface ReconCase {
  id: string;
  kind: string;
  status: string;
  studentId: string | null;
  createdAt: string;
  resolution: string | null;
}

interface ReconRun {
  id: string;
  scope: string;
  status: string;
  summary: { diffs?: number; repaired?: number; cases?: number } | null;
  startedAt: string;
}

// Expected-vs-actual reconciliation: SIS truth against simulator
// projections. Safe diffs repair by requeue; the rest open governed cases.
export default async function ReconciliationPage() {
  const [health, runs, cases] = await Promise.all([
    loadStaff<{ backend?: string }>("/health"),
    loadStaff<{ items: ReconRun[] }>("/reconciliation/runs"),
    loadStaff<{ items: ReconCase[] }>("/reconciliation/cases"),
  ]);
  if (!health.ok || !runs.ok || !cases.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Reconciliation</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs operations authority. Sign in with an operations role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );

  const backendLabel = moodleBackendLabel(health.data.backend);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Reconciliation</h1>
        <p>
          <Link href="/admin/integration">Integration support</Link> ·{" "}
          <Link href="/admin/moodle">Moodle administration</Link>
        </p>

        <section
          className={styles.section}
          aria-label="Reconciliation authority"
        >
          <h2>Expected and actual state</h2>
          <p>
            SIS registration and teaching records define expected state.
            {backendLabel} is destination evidence. Reconciliation may safely
            requeue delivery, but it never rewrites SIS truth to match a
            destination discrepancy.
          </p>
        </section>

        <section className={styles.section} aria-label="Run reconciliation">
          <h2>Run reconciliation</h2>
          <ReconForms />
        </section>

        <section className={styles.section} aria-label="Reconciliation runs">
          <h2>Runs</h2>
          {runs.data.items.length === 0 ? (
            <p>No reconciliation runs yet.</p>
          ) : (
            <ul>
              {runs.data.items.map((run) => (
                <li key={run.id}>
                  <strong>
                    {run.scope} · {run.status}
                  </strong>{" "}
                  — diffs {run.summary?.diffs ?? 0}, repaired{" "}
                  {run.summary?.repaired ?? 0}, cases {run.summary?.cases ?? 0}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-label="Reconciliation cases">
          <h2>Cases</h2>
          {cases.data.items.length === 0 ? (
            <p>No reconciliation cases. Differences open governed cases here.</p>
          ) : (
            <ul>
              {cases.data.items.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.kind} · {item.status}
                  </strong>{" "}
                  · ID {item.id}
                  {item.resolution ? ` — ${item.resolution}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
