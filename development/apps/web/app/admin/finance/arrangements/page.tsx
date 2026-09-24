import { cookies } from "next/headers";
import Link from "next/link";
import type { ArrangementView } from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { ArrangementDecide } from "./forms";
import { loadFinanceWorkspaceState } from "../finance-role";
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
  const [workspace, list] = await Promise.all([
    loadFinanceWorkspaceState(),
    loadStaff<{ items: ArrangementView[] }>("/arrangements"),
  ]);
  if (workspace.kind !== "ok" || !list.ok) {
    const denied =
      workspace.kind === "denied" ||
      (!list.ok && (list.status === 401 || list.status === 403));
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Payment arrangements"
          />
          <Notice
            severity="warning"
            title={denied ? "Finance access unavailable" : "Finance data temporarily unavailable"}
            message={
              denied
                ? "This workspace needs finance authority."
                : "The system could not confirm the arrangement queue. Keep the current references and retry when connectivity is restored."
            }
            action={
              denied
                ? { label: "Finance workspace", href: "/admin/finance" }
                : { label: "Retry arrangements", href: "/admin/finance/arrangements" }
            }
          />
        </main>
      </div>
    );
  }
  const role = workspace.role;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          eyebrow="Student Information System"
          title="Payment arrangements"
          lede="Review requested terms and apply the separate approver decision boundary."
        />
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
        {role === "FINANCE_APPROVER" ? (
          <>
            <h2>Decide arrangement</h2>
            <ArrangementDecide />
          </>
        ) : (
          <Notice
            severity="info"
            title="Separate approval"
            message="Finance Officers can review requests here. A Finance Approver makes the decision."
          />
        )}
      </main>
    </div>
  );
}
