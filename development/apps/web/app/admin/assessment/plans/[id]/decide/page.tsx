import { cookies } from "next/headers";
import Link from "next/link";
import type { AssessmentPlanView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { PlanDecideForm } from "./decide";
import styles from "../../../../../page.module.css";

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

// UI-DECISION-001 plan approval: frozen evidence package (components,
// weights, policy version), consequences, authority and the exact
// declaration. Approvals never overwrite; a second officer decides.
export default async function PlanDecidePage({
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
          <h1 className={styles.title}>Plan approval</h1>
          <Notice
            severity="warning"
            title="Plan unavailable"
            message="This plan needs assessment approval authority, or it does not exist in your scope."
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
          Plan approval · {item.offeringRef} {item.periodCode} v{item.version}
        </h1>
        <p>
          <Link href={`/admin/assessment/plans/${item.id}`}>Plan detail</Link> ·{" "}
          <Link href="/admin/assessment/plans">Assessment plans</Link>
        </p>
        <Notice
          severity="info"
          title="Frozen evidence package"
          message={`Version v${item.version} · policy ${item.policyVersion} · status ${item.status}. The evidence below is the exact version you sign; a later change invalidates this decision.`}
        />
        <h2>Evidence</h2>
        <dl>
          <dt>Offering</dt>
          <dd>{item.offeringRef}</dd>
          <dt>Period</dt>
          <dd>{item.periodCode}</dd>
          <dt>Version</dt>
          <dd>v{item.version}</dd>
          <dt>Policy version</dt>
          <dd>{item.policyVersion}</dd>
          <dt>Status</dt>
          <dd>{item.status}</dd>
        </dl>
        <h3>Components</h3>
        <ul>
          {item.components.map((c) => (
            <li key={c.id}>
              {c.code} · max {c.maxMark} · weight {c.weight} · scale{" "}
              {c.scaleRef} · moderation{" "}
              {c.moderationRequired ? "required" : "not required"} · ID {c.id}
            </li>
          ))}
        </ul>
        <pre>{JSON.stringify(item, null, 2)}</pre>
        {item.status === "DRAFT" ? (
          <>
            <h2>Sign the decision</h2>
            <p>
              Authority: programme coordinator with approve-assessment
              (school scope). The creator cannot approve their own plan — a
              second officer must decide.
            </p>
            <p>
              Consequence: approval supersedes any earlier approved plan for
              this offering and period; components become bindable for
              grade-activity mappings. This cannot be undone by editing.
            </p>
            <p>
              I confirm that I have reviewed the stated evidence and make
              this decision within my assigned authority.
            </p>
            <PlanDecideForm planId={item.id} version={item.version} />
          </>
        ) : (
          <Notice
            severity="info"
            title="Decision closed"
            message={`This plan is ${item.status}. Decided plans are never re-approved; draft a new version instead.`}
          />
        )}
      </main>
    </div>
  );
}
