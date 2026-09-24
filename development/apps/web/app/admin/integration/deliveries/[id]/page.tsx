import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import styles from "../../../../page.module.css";

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

interface DeliveryDetail {
  id: string;
  outboxId: string;
  eventType: string;
  state: string;
  attempt: number;
  nextRunAt: string | null;
  lastError: string | null;
  envelope: Record<string, unknown>;
  createdAt: string;
}

// SCR-OPS-DELIVERY-003 event delivery detail: source truth, destination
// state, attempt history and safe recovery. Payloads stay read-only.
export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadStaff<DeliveryDetail>(`/deliveries/${id}`);
  if (!detail.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Delivery attempt</h1>
          <Notice
            severity="warning"
            title="Delivery unavailable"
            message="This delivery needs integration authority, or it does not exist in your scope."
            action={{ label: "Event-delivery queue", href: "/admin/integration" }}
          />
        </main>
      </div>
    );

  const item = detail.data;
  const failed = ["DEAD_LETTER", "MANUAL_REVIEW"].includes(item.state);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Delivery {item.eventType}</h1>
        <p>
          <Link href="/admin/integration">Integration support</Link>
        </p>

        <section className={styles.section} aria-label="SIS source truth">
          <h2>SIS source truth</h2>
          <p>
            This delivery was produced from SIS outbox event {item.outboxId}.
            The originating SIS record remains authoritative; this page cannot
            edit registration, teaching or student source data.
          </p>
        </section>

        <section
          className={styles.section}
          aria-label="Moodle destination state"
        >
          <h2>Moodle destination state</h2>
          <p>
            {item.eventType} is currently <strong>{item.state}</strong> at the
            Moodle delivery boundary.
          </p>
          <p className={styles.supporting}>
            Destination state reports sync progress only. It never changes the
            meaning of the SIS source record.
          </p>
        </section>

        <section className={styles.section} aria-label="Attempt history">
          <h2>Attempt history</h2>
          <dl>
            <div>
              <dt>Attempt</dt>
              <dd>{item.attempt}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{item.createdAt}</dd>
            </div>
            <div>
              <dt>Next run</dt>
              <dd>{item.nextRunAt ?? "No retry scheduled"}</dd>
            </div>
            <div>
              <dt>Last error</dt>
              <dd>{item.lastError ?? "No errors recorded"}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.section} aria-label="Safe action">
          <h2>Safe action</h2>
          <p>
            {failed
              ? "Request a governed replay from Integration Support after reviewing the frozen evidence. Replay preserves idempotency and does not rewrite SIS source records."
              : "No destructive action is required here. Let the worker continue, or use governed replay only if this attempt later enters manual review or dead-letter state."}
          </p>
          <p>
            <Link href="/admin/integration">Return to replay and incident controls</Link>
          </p>
        </section>

        <section className={styles.section} aria-label="Technical envelope">
          <h2>Technical envelope</h2>
          <dl>
            {Object.entries(item.envelope).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value == null ? "Not recorded" : String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
