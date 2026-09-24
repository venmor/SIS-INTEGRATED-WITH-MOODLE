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
  eventType: string;
  state: string;
  attempt: number;
  nextRunAt: string | null;
  lastError: string | null;
  envelope: Record<string, unknown>;
}

// SCR-OPS-DELIVERY-003 event delivery detail: envelope, attempts and
// errors. Read-only in this slice; replay approval arrives in slice 5.
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
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Delivery {item.eventType} · {item.state}
        </h1>
        <p>
          <Link href="/admin/integration">Event-delivery queue</Link>
        </p>
        <p>
          Attempt {item.attempt}
          {item.nextRunAt ? ` · Next run ${item.nextRunAt}` : ""} ·{" "}
          {item.lastError ?? "No errors recorded."}
        </p>
        <h2>Envelope</h2>
        <pre>{JSON.stringify(item.envelope, null, 2)}</pre>
      </main>
    </div>
  );
}
