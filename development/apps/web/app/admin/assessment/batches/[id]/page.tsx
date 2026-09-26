import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeBatchView } from "@sis/contracts";
import { DataTable, Notice, StatusChip } from "@sis/ui";
import { SubmitBatchButton, ValidateBatchButton } from "../../batches/forms";
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

function tone(status: string) {
  if (status === "STAGED") return "success" as const;
  return "attention" as const;
}

// Batch detail: frozen snapshot lines with quarantine flags. Quarantined
// lines stay visible as evidence; nothing here edits marks or publishes
// results — validation and later workflows own those decisions.
export default async function GradeBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await loadStaff<GradeBatchView>(`/batches/${id}`);
  if (!res.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Grade batch</h1>
          <Notice
            severity="warning"
            title="Batch unavailable"
            message="This batch needs assessment authority, or it does not exist in your scope."
            action={{ label: "Grade batches", href: "/admin/assessment/batches" }}
          />
        </main>
      </div>
    );
  const item = res.data;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Grade batch · {item.status}
        </h1>
        <p>
          <Link href="/admin/assessment/batches">Grade batches</Link>
        </p>
        <Notice
          severity="info"
          title="Frozen staging snapshot"
          message={`Revision ${item.sourceRevision} · version v${item.version}. This snapshot never changes; corrections stage a new revision instead.`}
        />
        <dl>
          <dt>Mapping ID</dt>
          <dd>{item.mappingId}</dd>
          <dt>Source revision</dt>
          <dd>{item.sourceRevision}</dd>
          <dt>Status</dt>
          <dd>
            <StatusChip tone={item.status === "VALIDATED" ? "success" : "attention"}>
              {item.status}
            </StatusChip>
          </dd>
        </dl>
        <h2>Provenance (frozen at stage time)</h2>
        <p>
          Later plan or mapping changes never rewrite this snapshot;
          corrections stage a new revision instead.
        </p>
        <dl>
          <dt>Moodle instance</dt>
          <dd>{item.moodleInstance}</dd>
          <dt>Moodle course</dt>
          <dd>{item.moodleCourseRef}</dd>
          <dt>Moodle activity</dt>
          <dd>{item.moodleActivityId}</dd>
          <dt>Offering</dt>
          <dd>{item.offeringRef}</dd>
          <dt>Period</dt>
          <dd>{item.periodCode}</dd>
          <dt>Component</dt>
          <dd>
            {item.componentCode} (plan v{item.planVersion})
          </dd>
          <dt>Policy</dt>
          <dd>{item.policyVersion}</dd>
        </dl>
        <h2>Lines</h2>
        <DataTable
          hideTitle
          title="Batch lines"
          description="Staged marks with quarantine flags."
          columns={[
            {
              heading: "Student",
              render: (line: GradeBatchView["lines"][number]) =>
                line.studentRef,
            },
            {
              heading: "Raw mark",
              numeric: true,
              render: (line: GradeBatchView["lines"][number]) =>
                line.rawValue == null ? "—" : `${line.rawValue}`,
            },
            {
              heading: "Outcome",
              render: (line: GradeBatchView["lines"][number]) => line.outcome,
            },
            {
              heading: "Converted",
              numeric: true,
              render: (line: GradeBatchView["lines"][number]) =>
                line.convertedValue == null
                  ? "—"
                  : `${line.convertedValue}`,
            },
            {
              heading: "State",
              render: (line: GradeBatchView["lines"][number]) => (
                <StatusChip tone={tone(line.status)}>{line.status}</StatusChip>
              ),
            },
            {
              heading: "Flag",
              render: (line: GradeBatchView["lines"][number]) =>
                line.flagCode ?? "—",
            },
          ]}
          rows={item.lines}
          keyOf={(line) => line.id}
          emptyText="No lines in this batch."
        />
        <h2>Validation findings (read-only)</h2>
        <p>
          Findings are evidence for the result package. Resolving one
          never edits these lines; corrections stage a new revision.{" "}
          <Link href="/admin/assessment/findings">Open validation queue</Link>
        </p>
        {item.resultState ? (
          <p>
            Result state: <StatusChip tone="attention">{item.resultState}</StatusChip>
          </p>
        ) : null}
        <DataTable
          hideTitle
          title="Batch findings"
          description="Immutable validation findings for this batch."
          columns={[
            {
              heading: "Code",
              render: (finding: GradeBatchView["findings"][number]) =>
                finding.code,
            },
            {
              heading: "Lane",
              render: (finding: GradeBatchView["findings"][number]) =>
                finding.lane,
            },
            {
              heading: "State",
              render: (finding: GradeBatchView["findings"][number]) => (
                <StatusChip
                  tone={finding.status === "OPEN" ? "attention" : "neutral"}
                >
                  {finding.status}
                </StatusChip>
              ),
            },
            {
              heading: "Owner",
              render: (finding: GradeBatchView["findings"][number]) =>
                finding.ownerUnit ?? "—",
            },
            {
              heading: "Detail",
              render: (finding: GradeBatchView["findings"][number]) => (
                <Link href={`/admin/assessment/findings/${finding.id}`}>
                  Open finding
                </Link>
              ),
            },
          ]}
          rows={item.findings}
          keyOf={(finding) => finding.id}
          emptyText="No validation findings. Run validation to check this batch."
        />
        <h2>Run validation</h2>
        <p>
          Examinations only. Writes immutable findings; staged marks stay
          exactly as captured.
        </p>
        <ValidateBatchButton batchId={item.id} />
        <h2>Submit for moderation</h2>
        <p>
          Lecturers and coordinators only. Requires a validated batch
          with no open findings and a reconciled candidate list.
        </p>
        <SubmitBatchButton batchId={item.id} />
      </main>
    </div>
  );
}
