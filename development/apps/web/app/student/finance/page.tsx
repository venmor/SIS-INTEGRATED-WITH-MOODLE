import type {
  FinanceAccountView,
  InvoiceView,
  StatementView,
} from "@sis/contracts";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import {
  Card,
  DataTable,
  Money,
  Notice,
  PageHeader,
  StatusChip,
} from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import { formatMinor } from "../../../lib/money";
import styles from "./finance.module.css";

interface FinancePeriods {
  source: "FINANCE_INVOICE";
  asOf: string;
  items: Array<{
    code: string;
    issuedAt: string;
    dueAt: string | null;
    status: string;
  }>;
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

// Finance and clearance: summary with block-explanation, invoice and
// statement as aligned tables, receipts list. Every figure carries
// currency; the page formats, never calculates.
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const requested = (await searchParams).period;
  const available = await loadFinance<FinancePeriods>("/periods");
  if (!available.data) {
    return (
      <StudentUnavailable
        message={
          available.message ||
          "Your finance periods are unavailable. Try again shortly."
        }
      />
    );
  }
  if (available.data.items.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Finance and clearance"
          title="Finance and clearance"
        />
        <Notice
          severity="info"
          title="No invoice yet"
          message="Finance has not issued an invoice to your account. Check again after registration or contact Student Finance."
        />
      </>
    );
  }
  const selected = requested ?? available.data.items[0].code;
  if (!available.data.items.some((item) => item.code === selected)) {
    return (
      <>
        <PageHeader
          eyebrow="Finance and clearance"
          title="Finance and clearance"
        />
        <Notice
          severity="warning"
          title="Period not available"
          message="This period has no invoice in your account. Choose a period from your own finance history."
        />
        <Link href="/student/finance">View latest invoice</Link>
      </>
    );
  }
  const query = `?period=${encodeURIComponent(selected)}`;
  const [account, invoice, statement, paymentList] = await Promise.all([
    loadFinance<FinanceAccountView>(`/account${query}`),
    loadFinance<InvoiceView>(`/invoices${query}`),
    loadFinance<StatementView>(`/statement${query}`),
    loadFinance<{
      items: Array<{
        reference: string;
        status: string;
        amountMinor: number;
        currency: string;
        createdAt: string;
      }>;
    }>(`/payments${query}`),
  ]);
  if (!account.data || !invoice.data || !statement.data) {
    const failed = [account, invoice, statement].find((r) => r.message);
    if (failed)
      return (
        <>
          <PageHeader
            eyebrow="Finance and clearance"
            title="Finance and clearance"
          />
          <StudentUnavailable message={failed.message} />
        </>
      );
    return (
      <>
        <PageHeader
          eyebrow="Finance and clearance"
          title="Finance and clearance"
          lede="Your charges, payments and clearance for the period, with what to do next."
        />
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
      <PageHeader
        eyebrow={`Finance and clearance · ${account.data.period}`}
        title="Finance and clearance"
        lede="Your charges, payments and clearance for the period, with what to do next."
      />
      <form
        action="/student/finance"
        method="get"
        className={styles.periodPicker}
      >
        <label htmlFor="finance-period">Invoice period</label>
        <select id="finance-period" name="period" defaultValue={selected}>
          {available.data.items.map((item, index) => (
            <option key={item.code} value={item.code}>
              {item.code}
              {index === 0 ? " · Latest invoice" : ""}
            </option>
          ))}
        </select>
        <button type="submit">Show period</button>
      </form>
      <p className={styles.meta}>
        Finance invoices · Updated {formatLusaka(available.data.asOf)}. Latest
        invoice means most recently issued, not the university&apos;s current
        academic period.
      </p>
      <Notice
        severity={account.data.blocksRegistration ? "warning" : "success"}
        title={account.data.clearanceWording}
        message={`${account.data.nextAction} Outstanding: ${formatMinor(account.data.currency, account.data.outstandingMinor)}. ${account.data.blocksRegistration ? "This blocks final registration." : "Registration is not blocked by finance."} Support: ${account.data.supportRoute}.`}
      />
      <p className={styles.meta}>
        Student {account.data.studentNumber} · Sponsorship:{" "}
        {account.data.sponsorship} · Last confirmed{" "}
        {formatLusaka(account.data.refreshedAt)}
      </p>
      <p className={styles.actions}>
        <Link href={`/student/finance/pay${query}`}>
          Make a payment for {selected}
        </Link>{" "}
        ·{" "}
        <Link href={`/student/finance/arrange${query}`}>
          Request payment arrangement for {selected}
        </Link>
      </p>
      <Card title={`Invoice for ${invoice.data.period}`}>
        <p className={styles.meta}>
          Official reference {invoice.data.reference}
          {invoice.data.dueAt
            ? ` · Due ${formatLusaka(invoice.data.dueAt)}`
            : ""}{" "}
          · Fee schedule {invoice.data.policyVersion}
        </p>
        <DataTable
          hideTitle
          title={`Invoice ${invoice.data.reference}`}
          description="Charges for this period. Amounts include currency."
          columns={[
            {
              heading: "Description",
              render: (line) => (
                <>
                  <strong>{line.description}</strong>
                  <br />
                  <span className={styles.rule}>
                    {line.code} · Rule {line.feeRule}
                  </span>
                </>
              ),
            },
            {
              heading: "Amount",
              numeric: true,
              render: (line) => (
                <Money
                  currency={line.currency}
                  amountMinor={line.amountMinor}
                />
              ),
            },
          ]}
          rows={invoice.data.lines}
          keyOf={(line) => line.id}
          emptyText="No charge lines on this invoice."
        />
        <p className={styles.total}>
          Total:{" "}
          <Money
            currency={invoice.data.currency}
            amountMinor={invoice.data.totalMinor}
          />
        </p>
      </Card>
      <Card title="Statement">
        <DataTable
          hideTitle
          title="Statement"
          description="Posted charges for this period."
          columns={[
            {
              heading: "Description",
              render: (line) => (
                <>
                  {line.description}{" "}
                  <StatusChip tone="neutral">{line.status}</StatusChip>
                </>
              ),
            },
            {
              heading: "Amount",
              numeric: true,
              render: (line) => (
                <Money
                  currency={line.currency}
                  amountMinor={line.amountMinor}
                />
              ),
            },
          ]}
          rows={statement.data.lines}
          keyOf={(line) => line.id}
          emptyText="No statement lines for this period."
        />
        <p className={styles.total}>
          Invoiced{" "}
          <Money
            currency={statement.data.currency}
            amountMinor={statement.data.invoicedMinor}
          />{" "}
          · Paid{" "}
          <Money
            currency={statement.data.currency}
            amountMinor={statement.data.paidMinor}
          />{" "}
          · Outstanding{" "}
          <Money
            currency={statement.data.currency}
            amountMinor={statement.data.outstandingMinor}
          />
        </p>
      </Card>
      <Card title="Receipts">
        {receipts.length === 0 ? (
          <p className={styles.meta}>
            No confirmed payments yet. Receipts appear here after Finance
            confirms a payment.
          </p>
        ) : (
          <ul className={styles.receipts}>
            {receipts.map((receipt) => (
              <li key={receipt.reference}>
                <p>
                  <strong>Receipt {receipt.reference}</strong> —{" "}
                  <Money
                    currency={receipt.currency}
                    amountMinor={receipt.amountMinor}
                  />
                </p>
                <p className={styles.meta}>
                  Confirmed {formatLusaka(receipt.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
