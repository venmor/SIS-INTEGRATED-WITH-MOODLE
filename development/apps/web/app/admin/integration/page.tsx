import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import { ReplayRequestForm } from "./replays/forms";
import { PauseForm } from "./pause";
import { IncidentForms } from "./incidents";
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

interface HealthView {
  provider: string;
  status: string;
  lastCheckedAt: string | null;
}

interface QueueItem {
  id: string;
  eventType?: string;
  title?: string;
  severity?: string;
  state?: string;
  status: string;
  attempt?: number;
  lastError?: string | null;
  createdAt?: string;
}

// SCR-OPS-INT-002 Integration support workspace: event-delivery queue,
// dead letters, replay requests, incidents and pause control. Payloads
// are never edited here and dead letters are never deleted.
export default async function IntegrationPage() {
  const [health, queue, dead, replays, incidents] = await Promise.all([
    loadStaff<HealthView>("/health"),
    loadStaff<{ items: QueueItem[] }>("/deliveries"),
    loadStaff<{ items: QueueItem[] }>("/dead-letters"),
    loadStaff<{ items: QueueItem[] }>("/replays"),
    loadStaff<{ items: QueueItem[] }>("/incidents"),
  ]);
  if (
    !health.ok ||
    !queue.ok ||
    !dead.ok ||
    !replays.ok ||
    !incidents.ok
  )
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Integration support</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs integration support authority. Sign in with an integration role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );

  const pendingReplays = replays.data.items.filter(
    (item) => item.status === "PENDING",
  );
  const openIncidents = incidents.data.items.filter(
    (item) => item.status !== "CLOSED",
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Integration support</h1>
        <p className={styles.lede}>
          Triage delivery failures, governed replays and incidents while SIS
          source records remain unchanged.
        </p>

        <section className={styles.section} aria-label="Needs attention">
          <h2>Needs attention</h2>
          {dead.data.items.length === 0 &&
          pendingReplays.length === 0 &&
          openIncidents.length === 0 ? (
            <p>No dead letter, replay decision or open incident needs action.</p>
          ) : (
            <ul>
              {dead.data.items.length > 0 ? (
                <li>
                  {dead.data.items.length} dead letter or manual-review delivery
                  {dead.data.items.length === 1 ? "" : "ies"} need triage.
                </li>
              ) : null}
              {pendingReplays.length > 0 ? (
                <li>
                  {pendingReplays.length} replay request
                  {pendingReplays.length === 1 ? "" : "s"} await a second
                  officer.
                </li>
              ) : null}
              {openIncidents.length > 0 ? (
                <li>
                  {openIncidents.length} open incident
                  {openIncidents.length === 1 ? "" : "s"} require recovery
                  evidence before closure.
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-label="Health and freshness">
          <h2>Health and freshness</h2>
          <Notice
            severity={health.data.status === "HEALTHY" ? "success" : "warning"}
            title={`Connection ${health.data.status}`}
            message={`Provider ${health.data.provider}. Delivery state is operational evidence; SIS remains the source of record.`}
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
          {queue.data.items.length === 0 ? (
            <p>No delivery attempts yet.</p>
          ) : (
            <ul>
              {queue.data.items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/integration/deliveries/${item.id}`}>
                    {item.eventType} · {item.state}
                  </Link>{" "}
                  — attempt {item.attempt}
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link href="/admin/integration/reconciliation">Open reconciliation</Link>{" "}
            to compare SIS expected state with the Moodle simulator.
          </p>
        </section>

        <section
          className={styles.section}
          aria-label="Recent incident evidence"
        >
          <h2>Recent incident evidence</h2>
          {incidents.data.items.length === 0 ? (
            <p>No incidents recorded.</p>
          ) : (
            <ul>
              {incidents.data.items.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.title} · {item.severity} · {item.status}
                  </strong>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.supporting}>
            Incident closure requires recovery evidence; queue rows and dead
            letters are retained rather than deleted.
          </p>
        </section>

        <section className={styles.section} aria-label="Replay controls">
          <h2>Replay controls</h2>
          {dead.data.items.length > 0 ? (
            <ul>
              {dead.data.items.slice(0, 5).map((item) => (
                <li key={item.id}>
                  {item.eventType} · {item.state} · attempt {item.attempt} · ID{" "}
                  {item.id}
                </li>
              ))}
            </ul>
          ) : null}
          <ReplayRequestForm />
          {replays.data.items.length === 0 ? (
            <p>No replay requests.</p>
          ) : (
            <ul>
              {replays.data.items.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/integration/replays/${item.id}`}>
                    {item.id.slice(0, 8)} · {item.status}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-label="Delivery controls">
          <h2>Delivery controls</h2>
          <PauseForm />
        </section>

        <section className={styles.section} aria-label="Incident controls">
          <h2>Incident controls</h2>
          <IncidentForms />
        </section>
      </main>
    </div>
  );
}
