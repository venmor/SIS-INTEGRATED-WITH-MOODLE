import { cookies } from "next/headers";
import Link from "next/link";
import { Icon, Notice, PageHeader, StatusChip } from "@sis/ui";
import { loadFinanceWorkspaceRole } from "./finance-role";
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

interface WorkItem {
  href: string;
  title: string;
  icon: "reconciliation" | "receipt" | "finance" | "identity";
  count: number | null;
  state: string;
  body: string;
}

export default async function FinanceWorkspacePage() {
  const role = await loadFinanceWorkspaceRole();
  if (!role)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader eyebrow="Student Information System" title="Finance workspace" />
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs finance authority. Sign in with a finance role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );

  const [adjustments, arrangements, cases] = await Promise.all([
    loadStaff<{ items: unknown[] }>("/adjustments"),
    loadStaff<{ items: unknown[] }>("/arrangements"),
    role === "FINANCE_OFFICER"
      ? loadStaff<{ items: unknown[] }>("/cases")
      : Promise.resolve({ ok: true as const, data: { items: [] as unknown[] } }),
  ]);

  if (!cases.ok || !adjustments.ok || !arrangements.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader eyebrow="Student Information System" title="Finance workspace" />
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="Finance data is temporarily unavailable. Keep the current reference and retry when the service recovers."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );

  const shared: WorkItem[] = [
    {
      href: "/admin/finance/adjustments",
      title: "Adjustments and refunds",
      icon: "receipt",
      count: adjustments.data.items.length,
      state: "Awaiting decision",
      body:
        role === "FINANCE_APPROVER"
          ? "Approve or decline governed credits, waivers and refunds."
          : "Create governed credit, waiver and refund requests for separate approval.",
    },
    {
      href: "/admin/finance/arrangements",
      title: "Payment arrangements",
      icon: "finance",
      count: arrangements.data.items.length,
      state: "Awaiting decision",
      body:
        role === "FINANCE_APPROVER"
          ? "Approve or decline student arrangement requests."
          : "Review student arrangement requests before the approver decision.",
    },
  ];

  const work: WorkItem[] =
    role === "FINANCE_OFFICER"
      ? [
          {
            href: "/admin/finance/cases",
            title: "Reconciliation queue",
            icon: "reconciliation",
            count: cases.data.items.length,
            state: "Open cases",
            body: "Uncertain, duplicate and mismatch payments waiting for review.",
          },
          ...shared,
          {
            href: "/admin/finance/sponsorships",
            title: "Sponsorships",
            icon: "identity",
            count: null,
            state: "Manage coverage",
            body: "Sponsor coverage and supporting evidence.",
          },
          {
            href: "/admin/finance/cashier",
            title: "Cashier intake",
            icon: "receipt",
            count: null,
            state: "Record payment",
            body: "Reported bank and cash payments awaiting confirmation.",
          },
        ]
      : shared;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          eyebrow="Student Information System"
          title="Finance workspace"
          lede="Work requiring review, approval or confirmation."
        />
        <section className={styles.queue} aria-label="Finance work queue">
          <div className={styles.queueHeading}>
            <Icon name="finance" size={20} />
            <h2>Finance work queue</h2>
          </div>
          <ul>
            {work.map((item) => (
              <li key={item.href}>
                <div className={styles.itemIcon}>
                  <Icon name={item.icon} size={19} />
                </div>
                <div className={styles.itemBody}>
                  <Link href={item.href}>{item.title}</Link>
                  <p>{item.body}</p>
                </div>
                <div className={styles.itemState}>
                  {item.count !== null ? <strong>{item.count}</strong> : null}
                  <StatusChip
                    tone={item.count !== null && item.count > 0 ? "attention" : "neutral"}
                  >
                    {item.state}
                  </StatusChip>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
