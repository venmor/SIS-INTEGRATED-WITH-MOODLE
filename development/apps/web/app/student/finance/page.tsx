import type {
  FinanceAccountView,
  InvoiceView,
  StatementView,
} from "@sis/contracts";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import { formatMinor } from "../../../lib/money";
import styles from "../../applicant/applicant.module.css";

interface PaymentItem {
  reference: string;
  status: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
}

async function loadFinance<T>(
  path: string,
): Promise<{ data: T | null; message: string; missing: boolean }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Ffinance");
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/finance${path}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401)
      redirect("/sign-in?returnTo=%2Fstudent%2Ffinance");
    if (response.status === 404)
      return { data: null, message: "", missing: true };
    if (!response.ok)
      return {
        data: null,
        message:
          ((await response.json().catch(() => ({}))) as { message?: string })
            .message ?? "Your finance account is unavailable right now.",
        missing: false,
      };
    return { data: (await response.json()) as T, message: "", missing: false };
  } catch {
    return {
      data: null,
      message: "We cannot reach the finance service. Try again shortly.",
      missing: false,
    };
  }
}

// Finance home: clearance summary, invoice, statement, receipts. Every
// figure carries currency; the page formats, never calculates. Balances
// always say whether registration is blocked.
export default async function FinancePage() {
  const [account, invoice, statement, paymentList] = await Promise.all([
    loadFinance<FinanceAccountView>("/account?period=2026S1"),
    loadFinance<InvoiceView>("/invoices?period=2026S1"),
    loadFinance<StatementView>("/statement?period=2026S1"),
    loadFinance<{ items: PaymentItem[] }>("/payments?period=2026S1"),
  ]);
  if (!account.data || !invoice.data || !statement.data) {
    const failed = [account, invoice, statement].find((r) => r.message);
    if (failed)
      return (
        <>
          <p className={styles.eyebrow}>Finance and clearance</p>
          <h1>Finance and clearance</h1>
          <StudentUnavailable message={failed.message} />
        </>
      );
    return (
      <>
        <p className={styles.eyebrow}>Finance and clearance</p>
        <h1>Finance and clearance</h1>
        <Notice
          severity="info"
          title="No invoice yet"
          message="No invoice has been issued for this period yet. Finance issues your invoice after registration."
        />
      </>
    );
  }
  const receipts = (paymentList.data?.items ?? []).filter(
    (p) => p.status === "CONFIRMED",
  );
  return (
    <>
      <p className={styles.eyebrow}>
        Finance and clearance · {account.data.period}
      </p>
      <h1>Finance and clearance</h1>
      <Notice
        severity={account.data.blocksRegistration ? "warning" : "success"}
        title={account.data.clearanceWording}
        message={`${account.data.nextAction} Outstanding: ${formatMinor(account.data.currency, account.data.outstandingMinor)}. ${account.data.blocksRegistration ? "This blocks final registration." : "Registration is not blocked by finance."} Support: ${account.data.supportRoute}.`}
      />
      <p className={styles.muted}>
        Student {account.data.studentNumber} · Sponsorship:{" "}
        {account.data.sponsorship} · Last confirmed{" "}
        {formatLusaka(account.data.refreshedAt)}
      </p>
      <p>
        <Link href="/student/finance/pay">Make a payment</Link> ·{" "}
        <Link href="/student/finance/arrange">Request payment arrangement</Link>
      </p>
      <h2>Invoice for {invoice.data.period}</h2>
      <p className={styles.muted}>
        Official reference {invoice.data.reference}
        {invoice.data.dueAt ? ` · Due ${formatLusaka(invoice.data.dueAt)}` : ""} ·
        Fee schedule {invoice.data.policyVersion}
      </p>
      <ul>
        {invoice.data.lines.map((line) => (
          <li key={line.id}>
            <p>
              <strong>{line.description}</strong> —{" "}
              {formatMinor(line.currency, line.amountMinor)}
            </p>
            <p className={styles.muted}>
              {line.code} · Rule {line.feeRule} · {line.currency}
            </p>
          </li>
        ))}
      </ul>
      <p>
        <strong>
          Total: {formatMinor(invoice.data.currency, invoice.data.totalMinor)}
        </strong>
      </p>
      <h2>Statement</h2>
      <ul>
        {statement.data.lines.map((line) => (
          <li key={line.id}>
            <p>
              {line.description} —{" "}
              {formatMinor(line.currency, line.amountMinor)} · {line.status}
            </p>
          </li>
        ))}
      </ul>
      <p>
        Invoiced{" "}
        {formatMinor(statement.data.currency, statement.data.invoicedMinor)} ·
        Paid {formatMinor(statement.data.currency, statement.data.paidMinor)} ·
        Outstanding{" "}
        {formatMinor(
          statement.data.currency,
          statement.data.outstandingMinor,
        )}
      </p>
      <h2>Receipts</h2>
      {receipts.length === 0 ? (
        <p className={styles.muted}>
          No confirmed payments yet. Receipts appear here after Finance
          confirms a payment.
        </p>
      ) : (
        <ul>
          {receipts.map((receipt) => (
            <li key={receipt.reference}>
              <p>
                <strong>Receipt {receipt.reference}</strong> —{" "}
                {formatMinor(receipt.currency, receipt.amountMinor)}
              </p>
              <p className={styles.muted}>
                Confirmed {formatLusaka(receipt.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
