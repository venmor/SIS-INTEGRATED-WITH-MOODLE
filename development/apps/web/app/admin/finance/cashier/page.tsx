import { cookies } from "next/headers";
import Link from "next/link";
import { Notice, PageHeader } from "@sis/ui";
import { CashierForms } from "./forms";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

async function cashierAuthority(
  sid: string,
): Promise<"allowed" | "denied" | "unavailable"> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    // The reconciliation queue requires the same FINANCE_OFFICER capability
    // used by cashier intake, without mutating any finance state.
    const response = await fetch(`${api}/finance/cases`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) return "denied";
    return response.ok ? "allowed" : "unavailable";
  } catch {
    return "unavailable";
  }
}

// Cashier intake: provisional recording of reported bank/cash payments
// against receipt numbers, then confirmation into the ledger. Amounts
// must match exactly; receipts are unique.
export default async function CashierPage() {
  const sid = (await cookies()).get("sid")?.value;
  const authority = sid ? await cashierAuthority(sid) : "denied";

  if (authority !== "allowed")
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Cashier intake"
          />
          <Notice
            severity="warning"
            title={
              authority === "denied"
                ? "Cashier access unavailable"
                : "Finance service temporarily unavailable"
            }
            message={
              authority === "denied"
                ? "This workspace needs Finance Officer authority."
                : "The finance service could not confirm your authority. Keep the current reference and retry when connectivity is restored."
            }
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
          title="Cashier intake"
          lede="Record a reported payment against its unique receipt, then confirm it into the ledger without editing the original request."
        />
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <CashierForms />
      </main>
    </div>
  );
}
