import staffUi from "../../../staff-workspace.module.css";
import { cookies } from "next/headers";
import Link from "next/link";
import type {
  EntityTimelineResponse,
  ResultPackageDetailView,
} from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import { BoardDecisionForm } from "../forms";
import styles from "../../../staff-workspace.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
  domain = "assessment",
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/${domain}${path}`, {
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
            action={{
              label: "Board packages",
              href: "/admin/assessment/packages",
            }}
          />
        </main>
      </div>
    );
  // Timeline disclosure is checked independently by the existing scoped API.
  const history = await loadStaff<EntityTimelineResponse>(
    `/audit/timeline/entity/result-package/${id}`,
    "auth",
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
        <dl className={staffUi.factGrid}>
          <dt>Status</dt>
          <dd>
            <StatusChip
              tone={
                item.status === "APPROVED_FOR_RELEASE" ? "success" : "attention"
              }
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
        <section className={staffUi.panel}>
          <h2 className={staffUi.sectionHeading}>Weighted preview</h2>
          <ul className={staffUi.recordList}>
            {(trace.students ?? []).map((s) => (
              <li key={s.studentRef}>
                {s.studentRef}: {s.rounded}
              </li>
            ))}
          </ul>
        </section>
        <section className={staffUi.panel}>
          <h2 className={staffUi.sectionHeading}>Board decisions</h2>
          {item.decisions.length === 0 ? (
            <p className={staffUi.empty}>No board decision recorded yet.</p>
          ) : (
            <ul className={staffUi.recordList}>
              {item.decisions.map((d) => (
                <li key={`${d.version}-${d.to}`}>
                  {d.to} — {d.reason ?? "no reason recorded"} ({d.decidedAt})
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link href={`/admin/assessment/packages/${item.id}/release`}>
              Review official release
            </Link>
          </p>
          <section aria-labelledby="package-history-heading">
            <h2 className={staffUi.sectionHeading} id="package-history-heading">
              History
            </h2>
            <p>Up to 100 latest events, newest first.</p>
            {!history.ok ? (
              <Notice
                severity="warning"
                title="History unavailable"
                message="Package history could not be checked. Refresh to try again, or contact the responsible examinations office."
              />
            ) : history.data.items.length === 0 ? (
              <p className={staffUi.empty}>No history recorded yet.</p>
            ) : (
              <ol>
                {history.data.items.map((event, index) => (
                  <li key={`${event.source}-${event.occurredAt}-${index}`}>
                    <p>{event.summary}</p>
                    <p>
                      <time dateTime={event.occurredAt}>
                        {event.occurredAt}
                      </time>
                      {event.actorRole ? ` · ${event.actorRole}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </section>
        <section className={staffUi.panel}>
          <h2 className={staffUi.sectionHeading}>Record board decision</h2>
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
        </section>
      </main>
    </div>
  );
}
