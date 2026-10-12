import { cookies } from "next/headers";
import Link from "next/link";
import type { NotificationRecordView } from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

// Staff signal queue (TASK-PH8-001): a scoped projection over the
// same notification records — role+scope matched server-side, never
// another lane's rows. Escalated mandatory failures and deadline
// signals surface here for the responsible office.
async function loadSignals(): Promise<{
  ok: boolean;
  items: NotificationRecordView[];
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, items: [] };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/notifications/records/signals`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, items: [] };
    return {
      ok: true,
      items: ((await res.json()) as { items: NotificationRecordView[] }).items,
    };
  } catch {
    return { ok: false, items: [] };
  }
}

export default async function StaffSignalsPage() {
  const res = await loadSignals();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Staff signals</h1>
        <p>
          <Link href="/admin">Administration</Link>
        </p>
        {!res.ok ? (
          <Notice
            severity="warning"
            title="Restricted area"
            message="Staff signals need an authorized staff workspace. Switch workspace, or ask an administrator."
          />
        ) : res.items.length === 0 ? (
          <Notice
            severity="info"
            title="No signals"
            message="Escalations and deadline signals for your scope will appear here."
          />
        ) : (
          <ul>
            {res.items.map((item) => (
              <li key={item.id}>
                <p>
                  <strong>{item.title}</strong>{" "}
                  <StatusChip
                    tone={item.state === "READ" ? "info" : "attention"}
                  >
                    {item.state}
                  </StatusChip>
                </p>
                <p>
                  {item.event} · {item.category}
                  {item.mandatory ? " · mandatory" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
