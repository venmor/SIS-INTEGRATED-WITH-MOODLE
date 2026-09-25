import { cookies } from "next/headers";
import Link from "next/link";
import type { AssessmentPlanView } from "@sis/contracts";
import { DataTable, Notice, StatusChip } from "@sis/ui";
import styles from "../../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/assessment${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// Plan detail: frozen evidence for the decision page (components,
// weights, policy version, version). Approval happens only on the
// dedicated decide page, never inline.
export default async function AssessmentPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await loadStaff<{ items: AssessmentPlanView[] }>("/plans");
  const item = list.ok
    ? list.data.items.find((p) => p.id === id)
    : undefined;
  if (!item)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Assessment plan</h1>
          <Notice
            severity="warning"
            title={!list.ok && (list.status === 401 || list.status === 403) ? "Restricted area" : "Plan unavailable"}
            message="This plan needs assessment authority, or it does not exist in your scope."
            action={{ label: "Assessment plans", href: "/admin/assessment/plans" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Assessment plan · {item.offeringRef} {item.periodCode} v{item.version}
        </h1>
        <p>
          <Link href="/admin/assessment/plans">Assessment plans</Link> ·{" "}
          <Link href={`/admin/assessment/plans/${item.id}/decide`}>
            Decide approval
          </Link>
        </p>
        <Notice
          severity="info"
          title={`Plan ${item.status} · policy ${item.policyVersion}`}
          message={`Version v${item.version} is the frozen evidence the approver signs. Approvals supersede; they never edit.`}
        />
        <p>
          Status <StatusChip tone={item.status === "APPROVED" ? "success" : item.status === "DRAFT" ? "attention" : "neutral"}>{item.status}</StatusChip> ·
          Version v{item.version} · Policy {item.policyVersion}
        </p>
        <h2>Components</h2>
        <DataTable
          hideTitle
          title="Plan components"
          description="Component codes with maximum marks, weights, scales and moderation."
          columns={[
            {
              heading: "Code",
              render: (c: AssessmentPlanView["components"][number]) => (
                <strong>{c.code}</strong>
              ),
            },
            {
              heading: "Max mark",
              numeric: true,
              render: (c: AssessmentPlanView["components"][number]) =>
                String(c.maxMark),
            },
            {
              heading: "Weight",
              numeric: true,
              render: (c: AssessmentPlanView["components"][number]) =>
                String(c.weight),
            },
            {
              heading: "Scale",
              render: (c: AssessmentPlanView["components"][number]) => c.scaleRef,
            },
            {
              heading: "Moderation",
              render: (c: AssessmentPlanView["components"][number]) =>
                c.moderationRequired ? "Required" : "Not required",
            },
            {
              heading: "Component ID",
              render: (c: AssessmentPlanView["components"][number]) => c.id,
            },
          ]}
          rows={item.components}
          keyOf={(c) => c.id}
          emptyText="No components on this plan."
        />
      </main>
    </div>
  );
}
