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

interface QueueItem {
  id: string;
  eventType?: string;
  title?: string;
  severity?: string;
  state?: string;
  status: string;
  attempt?: number;
  createdAt?: string;
}

// SCR-OPS-INT-002 Integration support workspace: event-delivery queue,
// dead letters, replay requests, incidents and pause control. Payloads
// are never edited here and dead letters are never deleted.
export default async function IntegrationPage() {
  const [queue, dead, replays, incidents] = await Promise.all([
    loadStaff<{ items: QueueItem[] }>("/deliveries"),
    loadStaff<{ items: QueueItem[] }>("/dead-letters"),
    loadStaff<{ items: QueueItem[] }>("/replays"),
    loadStaff<{ items: QueueItem[] }>("/incidents"),
  ]);
  if (!queue.ok || !dead.ok || !replays.ok || !incidents.ok)
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
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Integration support</h1>
        <PauseForm />
        <h2>Event-delivery queue</h2>
        {queue.data.items.length === 0 ? (
          <p>No delivery attempts yet.</p>
        ) : (
          <ul>
            {queue.data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/integration/deliveries/${item.id}`}>
                  {item.eventType} · {item.state}
                </Link>{" "}
                — attempt {item.attempt}
              </li>
            ))}
          </ul>
        )}
        <h2>Dead letters</h2>
        {dead.data.items.length === 0 ? (
          <p>No dead letters. Exhausted and permanent failures appear here.</p>
        ) : (
          <ul>
            {dead.data.items.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.eventType} · {item.state}
                </strong>{" "}
                — {item.id}
              </li>
            ))}
          </ul>
        )}
        <h2>Request replay</h2>
        <ReplayRequestForm />
        <h2>Replay decisions</h2>
        {replays.data.items.length === 0 ? (
          <p>No replay requests.</p>
        ) : (
          <ul>
            {replays.data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/integration/replays/${item.id}`}>
                  {item.id.slice(0, 8)} · {item.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href="/admin/integration/reconciliation">Reconciliation</Link>{" "}
          — expected-vs-actual runs and governed cases.
        </p>
        <h2>Incidents</h2>
        {incidents.data.items.length === 0 ? (
          <p>No incidents.</p>
        ) : (
          <ul>
            {incidents.data.items.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.title} · {item.severity} · {item.status}
                </strong>{" "}
                · ID {item.id}
              </li>
            ))}
          </ul>
        )}
        <IncidentForms />
      </main>
    </div>
  );
}
