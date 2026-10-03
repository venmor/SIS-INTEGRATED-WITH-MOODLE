import { cookies } from "next/headers";
import Link from "next/link";
import type {
  AmendmentCaseDetailView,
  AmendmentCaseView,
  ReleaseView,
  ResultPackageDetailView,
} from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import {
  BoardDecisionForm,
  DecideAmendmentForm,
  ReleaseResultsForm,
  RequestAmendmentForm,
} from "../forms";
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
              tone={
                item.status === "RELEASED" ||
                item.status === "APPROVED_FOR_RELEASE"
                  ? "success"
                  : "attention"
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
        <h2>Record board decision</h2>
        <p>
          Only the examinations authority records board decisions, and never
          for a package it prepared. Approval for release never publishes to
          students by itself; publishing happens only through the official
          release below.
        </p>
        <BoardDecisionForm
          packageId={item.id}
          version={item.version}
          decided={decided}
        />
        <h2>Official release</h2>
        {item.status === "RELEASED" ? (
          <ReleaseSummary packageId={item.id} />
        ) : item.status === "APPROVED_FOR_RELEASE" ? (
          <>
            <p>
              Only the examinations authority releases approved packages.
              Release publishes immutable official results; students see
              only their own. Delivery failure never rolls back the
              release.
            </p>
            <ReleaseResultsForm packageId={item.id} />
          </>
        ) : (
          <p>
            Release unlocks once the board approves this package for
            release. Nothing is published to students before then.
          </p>
        )}
        <h2>Result amendments</h2>
        {item.status === "RELEASED" ? (
          <AmendmentSection packageId={item.id} />
        ) : (
          <p>
            Amendments open once this package is released. Corrections to
            released results create new audited versions; history is never
            overwritten.
          </p>
        )}
      </main>
    </div>
  );
}

async function ReleaseSummary({ packageId }: { packageId: string }) {
  const res = await loadStaff<ReleaseView>(`/releases/${packageId}`);
  if (!res.ok) return null;
  const release = res.data;
  return (
    <dl>
      <dt>Release status</dt>
      <dd>
        <StatusChip tone="success">{release.status}</StatusChip>
      </dd>
      <dt>Students published</dt>
      <dd>{release.studentCount}</dd>
      <dt>Release hash</dt>
      <dd>{release.releaseHash}</dd>
      <dt>Published</dt>
      <dd>{release.publishedAt}</dd>
    </dl>
  );
}

// Amendment history (TASK-PH7-007): controlled post-release cases on
// this package. Requesters open cases with reason + evidence +
// corrected total; the examinations authority approves (new official
// version + progression-recalculation task) or declines with reason.
async function AmendmentSection({ packageId }: { packageId: string }) {
  const res = await loadStaff<{ items: AmendmentCaseView[] }>(
    `/amendments?packageId=${packageId}`,
  );
  const items = res.ok ? res.data.items : [];
  return (
    <>
      <p>
        Only released results are amended, and only through a case:
        approval publishes a new immutable official version and queues
        a progression-recalculation task. The original stays in
        history.
      </p>
      <h3>Request amendment</h3>
      <RequestAmendmentForm packageId={packageId} />
      <h3>Amendment cases</h3>
      {items.length === 0 ? (
        <p>No amendment cases for this package yet.</p>
      ) : (
        <ul>
          {items.map((c) => (
            <li key={c.id}>
              <AmendmentCaseRow item={c} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function AmendmentCaseRow({ item }: { item: AmendmentCaseView }) {
  const res = await loadStaff<AmendmentCaseDetailView>(
    `/amendments/${item.id}`,
  );
  const decided = item.status !== "OPEN";
  const impacts = res.ok ? res.data.impacts : [];
  return (
    <>
      <p>
        <strong>
          {item.studentRef} · {item.status}
        </strong>{" "}
        <StatusChip tone={item.status === "APPROVED" ? "success" : "info"}>
          {item.status}
        </StatusChip>
      </p>
      <p>
        Corrected total {item.correctedTotal} ({item.correctedOutcome}) —
        requested {item.createdAt.slice(0, 10)}: {item.reason}
      </p>
      {impacts.length > 0 ? (
        <p>
          Impact tasks:{" "}
          {impacts.map((t) => `${t.kind} ${t.status}`).join(", ")}
        </p>
      ) : null}
      <DecideAmendmentForm
        caseId={item.id}
        version={item.version}
        decided={decided}
      />
    </>
  );
}
