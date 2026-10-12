import { RegistrationSteps } from "../../components/task-flow";
import workflow from "../../components/workflow.module.css";
import {
  parseAcademicContext,
  academicHref,
} from "../../../lib/academic-context";
import type { ReadinessView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import styles from "../../applicant/applicant.module.css";

async function loadReadiness(
  query: string,
): Promise<{ data: ReadinessView | null; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid)
    redirect(
      `/sign-in?returnTo=${encodeURIComponent(`/student/readiness${query}`)}`,
    );
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/readiness${query}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401)
      redirect(
        `/sign-in?returnTo=${encodeURIComponent(`/student/readiness${query}`)}`,
      );
    if (!response.ok)
      return {
        data: null,
        message:
          ((await response.json().catch(() => ({}))) as { message?: string })
            .message ??
          "Registration readiness is unavailable in your current workspace.",
      };
    return { data: (await response.json()) as ReadinessView, message: "" };
  } catch {
    return {
      data: null,
      message:
        "We cannot reach the registration service. Your record is kept. Try again shortly.",
    };
  }
}

const OVERALL: Record<
  string,
  { title: string; severity: "success" | "info" | "warning" }
> = {
  READY: { title: "Ready to register", severity: "success" },
  AWAITING_STUDENT_INPUT: {
    title: "Action needed",
    severity: "warning",
  },
  AWAITING_ACADEMIC_APPROVAL: {
    title: "Waiting on academic review",
    severity: "info",
  },
  AWAITING_FINANCIAL_CLEARANCE: {
    title: "Waiting on financial clearance",
    severity: "info",
  },
};

// Registration readiness: every condition names its owner, current state,
// and next step. Blocking rows explain the rule; nothing here completes a
// registration — that happens at formal submission.
export default async function ReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string | string[];
    attemptId?: string | string[];
  }>;
}) {
  const parsed = parseAcademicContext(await searchParams);
  if (!parsed.valid)
    return (
      <StudentUnavailable message="Choose a valid study period before checking readiness." />
    );
  const query = parsed.query.size ? `?${parsed.query}` : "";
  const r = await loadReadiness(query);
  if (!r.data) return <StudentUnavailable message={r.message} />;
  const board = r.data;
  const banner = OVERALL[board.overall] ?? {
    title: board.overall,
    severity: "info" as const,
  };
  return (
    <>
      <p className={styles.eyebrow}>Registration readiness · {board.period}</p>
      <h1>Registration readiness</h1>
      <RegistrationSteps
        current="readiness"
        context={Object.fromEntries(parsed.query)}
      />
      <Notice
        severity={banner.severity}
        title={banner.title}
        message={`Assessed ${formatLusaka(board.assessedAt)}. Each check shows the next action and responsible office.`}
      />
      <div className={workflow.actions}>
        <a
          className={workflow.action}
          href={academicHref(
            "/student/courses",
            Object.fromEntries(parsed.query),
          )}
        >
          Plan your courses
        </a>
        <a
          className={`${workflow.action} ${workflow.secondary}`}
          href={academicHref(
            "/student/register",
            Object.fromEntries(parsed.query),
          )}
        >
          Review registration
        </a>
      </div>
      <ul className={workflow.conditionGrid}>
        {board.conditions.map((condition) => (
          <li key={condition.key} className={workflow.condition}>
            <div className={workflow.panelHeader}>
              <h2>{condition.label}</h2>
              <StatusChip
                tone={
                  condition.status === "READY"
                    ? "success"
                    : condition.status === "BLOCKED"
                      ? "attention"
                      : "info"
                }
              >
                {condition.status
                  .replaceAll("_", " ")
                  .toLowerCase()
                  .replace(/^./, (c) => c.toUpperCase())}
              </StatusChip>
            </div>
            <p>{condition.next}</p>
            <details>
              <summary>Check details</summary>
              <dl>
                <div>
                  <dt>Responsible office</dt>
                  <dd>{condition.owner}</dd>
                </div>
                <div>
                  <dt>Assessment</dt>
                  <dd>{condition.detail}</dd>
                </div>
              </dl>
            </details>
          </li>
        ))}
      </ul>
      {board.pendingRegulations.length > 0 ? (
        <details className={workflow.panel}>
          <summary>Regulations requiring review</summary>
          <p className={workflow.meta}>{board.pendingRegulations.join(", ")}</p>
        </details>
      ) : null}
    </>
  );
}
