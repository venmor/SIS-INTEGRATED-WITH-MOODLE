import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import { CashierForms } from "./forms";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

// Cashier intake: provisional recording of reported bank/cash payments
// against receipt numbers, then confirmation into the ledger. Amounts
// must match exactly; receipts are unique.
export default async function CashierPage() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Cashier intake</h1>
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
        <h1 className={styles.title}>Cashier intake</h1>
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <CashierForms />
      </main>
    </div>
  );
}
