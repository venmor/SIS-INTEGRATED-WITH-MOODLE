import { cookies } from "next/headers";
import Link from "next/link";
import type { AdjustmentView } from "@sis/contracts";
import { DataTable, Money, Notice, PageHeader, StatusChip } from "@sis/ui";
import { AdjustmentForms } from "./forms";
import { loadFinanceWorkspaceRole } from "../finance-role";
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

// Adjustments and refunds: officers request, approvers decide (never the
// same person). Approved credits post compensating lines.
export default async function AdjustmentsPage() {
  const [role, list] = await Promise.all([
    loadFinanceWorkspaceRole(),
    loadStaff<{ items: AdjustmentView[] }>("/adjustments"),
  ]);
  if (!role || !list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Adjustments and refunds</h1>
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
        <PageHeader
          eyebrow="Student Information System"
          title="Adjustments and refunds"
          lede="Officers request; approvers decide — never the same person. Approved credits post compensating lines."
        />
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <AdjustmentForms role={role} />
        <h2>Awaiting decision</h2>
        <DataTable
          hideTitle
          title="Adjustments awaiting decision"
          description="Credit notes, waivers and refunds with reasons and amounts."
          columns={[
            {
              heading: "Kind",
              render: (item) => <strong>{item.kind}</strong>,
            },
            {
              heading: "Amount",
              numeric: true,
              render: (item) => (
                <Money currency={item.currency} amountMinor={item.amountMinor} />
              ),
            },
            {
              heading: "Reason",
              render: (item) => item.reason,
            },
            {
              heading: "State",
              render: (item) => (
                <StatusChip tone="attention">{item.status}</StatusChip>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No adjustments awaiting decision."
        />
      </main>
    </div>
  );
}
