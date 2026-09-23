import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";

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

// Finance workspace home (TASK-PH5-006): prioritized counts with links.
// Every figure links to its queue; authority stays server-side.
export default async function FinanceWorkspacePage() {
  const [cases, adjustments, arrangements] = await Promise.all([
    loadStaff<{ items: unknown[] }>("/cases"),
    loadStaff<{ items: unknown[] }>("/adjustments"),
    loadStaff<{ items: unknown[] }>("/arrangements"),
  ]);
  if (!cases.ok || !adjustments.ok || !arrangements.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Finance workspace</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs finance authority. Sign in with a finance role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Finance workspace</h1>
        <ul>
          <li>
            <Link href="/admin/finance/cases">
              Reconciliation queue ({cases.data.items.length} open)
            </Link>{" "}
            — uncertain, duplicate and mismatch cases.
          </li>
          <li>
            <Link href="/admin/finance/adjustments">
              Adjustments and refunds ({adjustments.data.items.length}{" "}
              awaiting decision)
            </Link>{" "}
            — maker/checker approvals.
          </li>
          <li>
            <Link href="/admin/finance/arrangements">
              Payment arrangements ({arrangements.data.items.length}{" "}
              awaiting decision)
            </Link>{" "}
            — student requests.
          </li>
          <li>
            <Link href="/admin/finance/sponsorships">
              Sponsorships
            </Link>{" "}
            — record and confirm coverage.
          </li>
          <li>
            <Link href="/admin/finance/cashier">Cashier intake</Link> —
            record and confirm reported payments.
          </li>
        </ul>
      </main>
    </div>
  );
}
