import { cookies } from "next/headers";
import Link from "next/link";
import { Card, Notice, PageHeader } from "@sis/ui";
import styles from "./finance-workspace.module.css";

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

interface WorkspaceCard {
  href: string;
  title: string;
  count: number | null;
  countLabel: string;
  body: string;
  action: string;
}

// Finance workspace home (TASK-PH5-006): prioritized work cards with
// live counts and one primary action each — not sentences in a list.
// Every figure links to its queue; authority stays server-side.
export default async function FinanceWorkspacePage() {
  const summary = await loadStaff<{
    reconciliationCases: number | null;
    adjustments: number;
    arrangements: number;
  }>("/workspace-summary");
  if (!summary.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Finance workspace"
          />
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs finance authority. Sign in with a finance role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  const cards: Array<WorkspaceCard> = [
    ...(summary.data.reconciliationCases === null
      ? []
      : [
          {
            href: "/admin/finance/cases",
            title: "Reconciliation queue",
            count: summary.data.reconciliationCases,
            countLabel: "open cases",
            body: "Uncertain, duplicate and mismatch payments waiting for review.",
            action: "Open queue",
          },
        ]),
    {
      href: "/admin/finance/adjustments",
      title: "Adjustments and refunds",
      count: summary.data.adjustments,
      countLabel: "awaiting decision",
      body: "Maker/checker approvals for credits, waivers and refunds.",
      action: "Review requests",
    },
    {
      href: "/admin/finance/arrangements",
      title: "Payment arrangements",
      count: summary.data.arrangements,
      countLabel: "awaiting decision",
      body: "Student arrangement requests with terms and reasons.",
      action: "Review requests",
    },
    ...(summary.data.reconciliationCases === null
      ? []
      : [
          {
            href: "/admin/finance/sponsorships",
            title: "Sponsorships",
            count: null,
            countLabel: "",
            body: "Record and confirm sponsor coverage with evidence.",
            action: "Manage sponsorships",
          },
          {
            href: "/admin/finance/cashier",
            title: "Cashier intake",
            count: null,
            countLabel: "",
            body: "Record reported bank and cash payments, then confirm them.",
            action: "Open cashier",
          },
        ]),
  ];
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          eyebrow="Student Information System"
          title="Finance workspace"
          lede="Prioritized work across reconciliation, approvals and intake. Counts update on every visit."
        />
        <div className={styles.grid}>
          {cards.map((card) => (
            <Card key={card.href} title={card.title}>
              {card.count !== null ? (
                <p className={styles.count}>
                  <strong>{card.count}</strong> {card.countLabel}
                </p>
              ) : null}
              <p className={styles.body}>{card.body}</p>
              <p className={styles.action}>
                <Link href={card.href}>{card.action}</Link>
              </p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
