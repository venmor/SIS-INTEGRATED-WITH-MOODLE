import { cookies } from "next/headers";
import Link from "next/link";
import type { ReconCaseDetailView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { ResolveForm } from "./resolve";
import styles from "../../../../page.module.css";

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

// SCR-REC-FIN-001 finance reconciliation case: charge/payment evidence,
// allocation, callback history, exception and authorized action.
export default async function FinanceCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadStaff<ReconCaseDetailView>(`/cases/${id}`);
  if (!detail.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Reconciliation case</h1>
          <Notice
            severity="warning"
            title="Case unavailable"
            message="This case needs finance authority, or it does not exist in your scope."
            action={{ label: "Reconciliation queue", href: "/admin/finance/cases" }}
          />
        </main>
      </div>
    );
  const kase = detail.data;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Case {kase.kind} · {kase.status}
        </h1>
        <p>
          <Link href="/admin/finance/cases">Reconciliation queue</Link>
        </p>
        <Notice
          severity={kase.status === "RESOLVED" ? "success" : "warning"}
          title={kase.safeMessage}
          message={`Provider reference: ${kase.providerRef ?? "unknown"}. The original records below are never edited or deleted.`}
        />
        <h2>Evidence</h2>
        <pre>{JSON.stringify(kase.detail, null, 2)}</pre>
        <h2>Callback history</h2>
        {kase.callbacks.length === 0 ? (
          <p>No callbacks recorded for this reference.</p>
        ) : (
          <ul>
            {kase.callbacks.map((callback, index) => (
              <li key={`${callback.receivedAt}-${index}`}>
                {callback.status} · {callback.receivedAt}
              </li>
            ))}
          </ul>
        )}
        <h2>Allocations on this account</h2>
        {kase.allocations.length === 0 ? (
          <p>No allocations yet.</p>
        ) : (
          <ul>
            {kase.allocations.map((allocation, index) => (
              <li key={`${allocation.chargeCode}-${index}`}>
                {allocation.chargeCode} — {allocation.amountMinor}
              </li>
            ))}
          </ul>
        )}
        {kase.status === "OPEN" || kase.status === "ESCALATED" ? (
          <>
            <h2>Resolve</h2>
            <ResolveForm caseId={kase.id} />
          </>
        ) : null}
      </main>
    </div>
  );
}
