import { cookies } from "next/headers";
import Link from "next/link";
import type { ArrangementView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { ArrangementDecide } from "./forms";
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

// Payment arrangements: student requests, approver decides. Approval
// grants a time-boxed clearance entitlement, not a vague note.
export default async function ArrangementsPage() {
  const list = await loadStaff<{ items: ArrangementView[] }>("/arrangements");
  if (!list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Payment arrangements</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs finance authority. Sign in with a finance role or ask an administrator."
            action={{ label: "Finance workspace", href: "/admin/finance" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Payment arrangements</h1>
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <h2>Awaiting decision</h2>
        {list.data.items.length === 0 ? (
          <p>No arrangements awaiting decision.</p>
        ) : (
          <ul>
            {list.data.items.map((item) => (
              <li key={item.id}>
                <strong>{item.terms}</strong> — {item.reason} · {item.status}
              </li>
            ))}
          </ul>
        )}
        <h2>Decide (approver only)</h2>
        <ArrangementDecide />
      </main>
    </div>
  );
}
