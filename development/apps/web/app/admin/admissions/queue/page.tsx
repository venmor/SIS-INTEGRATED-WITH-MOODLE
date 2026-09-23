import { cookies } from "next/headers";
import type { ReviewQueueItem } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../../page.module.css";
import { AdmissionsQueue } from "./queue";

export const dynamic = "force-dynamic";

async function loadQueue(
  query: string,
): Promise<{ ok: true; items: ReviewQueueItem[] } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/review/queue${query}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, items: ((await res.json()) as { items: ReviewQueueItem[] }).items };
  } catch {
    return { ok: false, status: 503 };
  }
}

export default async function AdmissionsQueuePage() {
  const [mine, pool] = await Promise.all([
    loadQueue("?scope=mine"),
    loadQueue("?scope=pool&state=Submitted"),
  ]);
  if (!mine.ok || !pool.ok) {
    const status = !mine.ok ? mine.status : (pool as { status: number }).status;
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Admissions queue</h1>
          <Notice
            severity="warning"
            title={
              status === 401 || status === 403
                ? "Restricted area"
                : "Queue unavailable"
            }
            message={
              status === 401 || status === 403
                ? "The admissions queue needs a reviewer workspace. Switch to one, or ask an administrator."
                : "We could not reach the review service. Your claimed cases are kept. Try again shortly."
            }
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Admissions queue</h1>
        <p className={styles.lede}>Review assigned cases and claim new work.</p>
        <AdmissionsQueue initialMine={mine.items} initialPool={pool.items} />
      </main>
    </div>
  );
}
