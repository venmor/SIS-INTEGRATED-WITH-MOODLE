import { cookies } from "next/headers";
import Link from "next/link";
import type { ResultPackageDetailView } from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import { BoardDecisionForm } from "../forms";
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

// Board package detail (TASK-PH7-005): frozen hash, weighted-total-v1
// trace summary, candidate reconciliation and the recorded declaration,
// plus the examinations board decision form. The decision the board
// records travels with reasons, date and authority; students never see
// this workspace.
export default async function BoardPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await loadStaff<ResultPackageDetailView>(`/packages/${id}`);
  if (!res.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Board package</h1>
          <Notice
            severity="warning"
            title="Package unavailable"
            message="This package needs board-package authority, or it does not exist in your workspace."
            action={{ label: "Board packages", href: "/admin/assessment/packages" }}
          />
        </main>
      </div>
    );
  const item = res.data;
  const trace = (item.trace ?? {}) as {
    formulaVersion?: string;
    students?: Array<{ studentRef: string; rounded: number }>;
    moderationRefs?: string[];
  };
  const decided = item.decisions.length > 0;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Board package · {item.status}</h1>
        <p>
          <Link href="/admin/assessment/packages">Board packages</Link> ·{" "}
          <Link href="/admin/assessment/moderation">Moderation queue</Link>
        </p>
        <Notice
          severity="info"
          title="Package declaration"
          message={item.declaration}
        />
        <dl>
          <dt>Status</dt>
          <dd>
            <StatusChip
              tone={item.status === "APPROVED_FOR_RELEASE" ? "success" : "attention"}
            >
              {item.status}
            </StatusChip>
          </dd>
          <dt>Offering</dt>
          <dd>{item.offeringRef}</dd>
          <dt>Period</dt>
          <dd>{item.periodCode}</dd>
          <dt>Package hash</dt>
          <dd>{item.packageHash}</dd>
          <dt>Formula</dt>
          <dd>{trace.formulaVersion ?? "—"}</dd>
          <dt>Students in preview</dt>
          <dd>{trace.students?.length ?? 0}</dd>
          <dt>Moderation cases referenced</dt>
          <dd>{trace.moderationRefs?.length ?? 0}</dd>
        </dl>
        <h2>Weighted preview</h2>
        <ul>
          {(trace.students ?? []).map((s) => (
            <li key={s.studentRef}>
              {s.studentRef}: {s.rounded}
            </li>
          ))}
        </ul>
        <h2>Board decisions</h2>
        {item.decisions.length === 0 ? (
          <p>No board decision recorded yet.</p>
        ) : (
          <ul>
            {item.decisions.map((d) => (
              <li key={`${d.version}-${d.to}`}>
                {d.to} — {d.reason ?? "no reason recorded"} ({d.decidedAt})
              </li>
            ))}
          </ul>
        )}
        <p><Link href={`/admin/assessment/packages/${item.id}/release`}>Review official release</Link></p>
        <h2>Record board decision</h2>
        <p>
          Only the examinations authority records board decisions, and never
          for a package it prepared. Approval for release never publishes to
          students; publication is a separate authorized action.
        </p>
        <BoardDecisionForm
          packageId={item.id}
          version={item.version}
          decided={decided}
        />
      </main>
    </div>
  );
}
