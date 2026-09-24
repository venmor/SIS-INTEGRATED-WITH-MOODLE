import type { FinanceAccountView } from "@sis/contracts";
import { FINANCE_DEMO_V1 } from "@sis/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../../chrome";
import { Card, DataTable, Money, PageHeader, StatusChip } from "@sis/ui";
import { PayForms } from "./forms";
import { formatLusaka } from "../../../../lib/time";

interface PaymentItem {
  reference: string;
  status: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
}

function statusTone(status: string) {
  if (status === "CONFIRMED") return "success" as const;
  if (status === "FAILED" || status === "EXPIRED") return "error" as const;
  return "info" as const;
}

type LoadState =
  | { kind: "ok"; account: FinanceAccountView; payments: PaymentItem[] }
  | { kind: "missing" }
  | { kind: "failed"; message: string };

async function loadPay(): Promise<LoadState> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Fpay");
  const headers = { cookie: `sid=${encodeURIComponent(sid)}` };
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  let accountRes: Response;
  let paymentsRes: Response;
  try {
    [accountRes, paymentsRes] = await Promise.all([
      fetch(`${base}/finance/account?period=2026S1`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`${base}/finance/payments?period=2026S1`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }),
    ]);
  } catch {
    return {
      kind: "failed",
      message: "We cannot reach the finance service. Try again shortly.",
    };
  }
  if (accountRes.status === 401 || paymentsRes.status === 401)
    redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Fpay");
  if (accountRes.status === 404) return { kind: "missing" };
  if (!accountRes.ok || !paymentsRes.ok)
    return {
      kind: "failed",
      message: "Your finance account is unavailable right now. Try again shortly.",
    };
  const account = (await accountRes.json()) as FinanceAccountView;
  const payments = (await paymentsRes.json()) as { items: PaymentItem[] };
  return { kind: "ok", account, payments: payments.items };
}

// Make-a-payment page: reviewed amount, explicit method choice, plain
// clearance effect, deadline, then one deliberate initiation. Open requests
// refuse with their reference ("do not pay again").
export default async function PayPage() {
  const state = await loadPay();
  if (state.kind === "missing")
    return (
      <>
        <PageHeader eyebrow="Make a payment" title="Make a payment" />
        <StudentUnavailable message="No invoice has been issued for this period yet. Finance issues your invoice after registration." />
      </>
    );
  if (state.kind === "failed")
    return (
      <>
        <PageHeader eyebrow="Make a payment" title="Make a payment" />
        <StudentUnavailable message={state.message} />
      </>
    );
  const open =
    state.payments.find((p) =>
      ["AWAITING_CONFIRMATION", "REPORTED", "INITIATED"].includes(p.status),
    ) ?? null;
  return (
    <>
      <PageHeader
        eyebrow="Make a payment"
        title="Make a payment"
        lede={`Amount due with currency, an explicit method choice, and the effect on clearance before you confirm.${state.account.dueAt ? ` Deadline ${formatLusaka(state.account.dueAt)}.` : ""}`}
      />
      <PayForms
        initial={{
          outstandingMinor: state.account.outstandingMinor,
          currency: state.account.currency,
          dueAt: state.account.dueAt,
          methods: FINANCE_DEMO_V1.methods as unknown as Array<{
            key: string;
            label: string;
          }>,
          openReference: open?.reference ?? null,
          openStatus: open?.status ?? null,
        }}
      />
      <Card title="Your payment requests">
        <DataTable
          hideTitle
          title="Payment requests"
          description="Every attempt with its state. An open request blocks a second attempt."
          columns={[
            {
              heading: "Reference",
              render: (item) => <strong>{item.reference}</strong>,
            },
            {
              heading: "Amount",
              numeric: true,
              render: (item) => (
                <Money currency={item.currency} amountMinor={item.amountMinor} />
              ),
            },
            {
              heading: "State",
              render: (item) => (
                <StatusChip tone={statusTone(item.status)}>
                  {item.status}
                </StatusChip>
              ),
            },
            {
              heading: "Started",
              render: (item) => formatLusaka(item.createdAt),
            },
          ]}
          rows={state.payments}
          keyOf={(item) => item.reference}
          emptyText="No payment requests for this period."
        />
      </Card>
    </>
  );
}
