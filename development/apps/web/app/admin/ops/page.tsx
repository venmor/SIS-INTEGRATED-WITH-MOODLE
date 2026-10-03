import { cookies } from "next/headers";
import Link from "next/link";
import type { OpsIncidentView, OpsQueueView } from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import { OpenIncidentForm, TransitionIncidentForm } from "./forms";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

// Operations console (TASK-PH8-003): open incidents plus linked-row
// counts into owning queues (dead-letters, replays, escalations,
// recon cases). Incident writes move the evidenced lifecycle;
// linked rows resolve in their owning queues, never here.
async function loadQueue(): Promise<{
  ok: boolean;
  queue: (OpsQueueView & { latest: OpsIncidentView[] }) | null;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, queue: null };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/ops/queue`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, queue: null };
    return { ok: true, queue: (await res.json()) as OpsQueueView & { latest: OpsIncidentView[] } };
  } catch {
    return { ok: false, queue: null };
  }
}

export default async function OpsConsolePage() {
  const res = await loadQueue();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Operations queue</h1>
        <p>
          <Link href="/admin">Administration</Link> ·{" "}
          <Link href="/admin/integration">Integration workspace</Link>
        </p>
        {!res.ok || !res.queue ? (
          <Notice
            severity="warning"
            title="Restricted area"
            message="The operations queue needs an integration-support workspace. Switch workspace, or ask an administrator."
          />
        ) : (
          <>
            <dl>
              <dt>Open incidents</dt>
              <dd>{res.queue.openIncidents}</dd>
              <dt>Acknowledged incidents</dt>
              <dd>{res.queue.acknowledgedIncidents}</dd>
              <dt>Pending notification dead-letters</dt>
              <dd>{res.queue.pendingNotificationDeadLetters}</dd>
              <dt>Pending integration dead-letters</dt>
              <dd>{res.queue.pendingIntegrationDeadLetters}</dd>
              <dt>Pending replays</dt>
              <dd>{res.queue.pendingReplays}</dd>
              <dt>Open escalations</dt>
              <dd>{res.queue.openEscalations}</dd>
              <dt>Open reconciliation cases</dt>
              <dd>{res.queue.openReconCases}</dd>
            </dl>
            <h2>Open incidents</h2>
            {res.queue.latest.length === 0 ? (
              <p>No open incidents. Dead-letters open them convergently; operators open the rest here.</p>
            ) : (
              <ul>
                {res.queue.latest.map((item) => (
                  <li key={item.id}>
                    <p>
                      <strong>
                        {item.title} · {item.severity}
                      </strong>{" "}
                      <StatusChip
                        tone={item.status === "OPEN" ? "attention" : "info"}
                      >
                        {item.status}
                      </StatusChip>
                    </p>
                    <p>
                      {item.sourceKind} · owned by {item.ownerRole ?? "unassigned"}
                    </p>
                    <TransitionIncidentForm item={item} />
                  </li>
                ))}
              </ul>
            )}
            <h2>Open incident</h2>
            <OpenIncidentForm />
            <h2>Recently resolved</h2>
            {res.queue.recentlyResolved.length === 0 ? (
              <p>No resolved incidents yet. Resolution keeps its recovery evidence here.</p>
            ) : (
              <ul>
                {res.queue.recentlyResolved.map((item) => (
                  <li key={item.id}>
                    <p>
                      <strong>
                        {item.title} · {item.severity}
                      </strong>{" "}
                      <StatusChip tone="success">{item.status}</StatusChip>
                    </p>
                    <p>Root cause: {item.rootCause ?? "—"}</p>
                    <p>Recovery evidence: {item.recoveryEvidence ?? "—"}</p>
                    <TransitionIncidentForm item={item} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
