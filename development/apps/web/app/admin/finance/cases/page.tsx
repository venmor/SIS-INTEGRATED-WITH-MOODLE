import { cookies } from "next/headers";
import Link from "next/link";
import type { ReconCaseView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/finance${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// Reconciliation queue: unreconciled, uncertain, duplicate and mismatch
// cases first. Originals are never edited here; resolution opens the case.
export default async function FinanceCasesPage() {
  const queue = await loadStaff<{ items: ReconCaseView[] }>("/cases");
  if (!queue.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Reconciliation queue</h1>
          <Notice
            severity="warning"
            title="Queue unavailable"
            message="This queue needs finance authority. Sign in with a finance role or ask an administrator."
            action={{ label: "Finance workspace", href: "/admin/finance" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Reconciliation queue</h1>
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        {queue.data.items.length === 0 ? (
          <Notice
            severity="success"
            title="Queue clear"
            message="No open reconciliation cases. Uncertain, duplicate and mismatched payments will appear here."
          />
        ) : (
          <ul>
            {queue.data.items.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/finance/cases/${item.id}`}>
                  {item.kind} · {item.status}
                </Link>{" "}
                — {item.safeMessage}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
