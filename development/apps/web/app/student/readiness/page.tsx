import { RegistrationSteps } from "../../components/task-flow";
import workflow from "../../components/workflow.module.css";
import { loadRegistrationContexts } from "../../../lib/load-registration-contexts";
import { ContextSelector } from "../context-selector";
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
import study from "../study-workflows.module.css";
import styles from "./readiness.module.css";

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
  } catch (error) {
    // Next's expired-session redirect must retain the intended study context.
    if (error && typeof error === "object" && "digest" in error) throw error;
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
  REGISTERED: { title: "Registration completed", severity: "success" },
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

function ReadinessConditions({
  conditions,
}: {
  conditions: ReadinessView["conditions"];
}) {
  return (
    <ul className={workflow.conditionGrid} aria-label="Registration conditions">
      {conditions.map((condition) => (
        <li key={condition.key} className={workflow.condition}>
          <div className={workflow.panelHeader}>
            <h2>{condition.label}</h2>
            <StatusChip
              tone={
                condition.status === "READY" || condition.status === "COMPLETE"
                  ? "success"
                  : condition.status === "NOT_APPLICABLE"
                    ? "neutral"
                    : condition.status === "BLOCKED" ||
                        condition.status === "ACTION_REQUIRED"
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
  );
}

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
  const registration =
    board.overall === "REGISTERED" &&
    board.registration?.status === "REGISTERED" &&
    board.registration.attemptId === board.attemptId &&
    board.registration.period === board.period
      ? board.registration
      : null;
  const receiptUnavailable = board.overall === "REGISTERED" && !registration;
  const banner = receiptUnavailable
    ? {
        title: "Registration details unavailable",
        severity: "warning" as const,
      }
    : (OVERALL[board.overall] ?? {
        title: board.overall,
        severity: "info" as const,
      });
  return (
    <div className={study.page}>
      <header className={study.intro}>
        <p className={study.eyebrow}>Registration readiness · {board.period}</p>
        <h1>Registration readiness</h1>
        <p className={study.muted}>
          {registration
            ? "Your official registration is complete. View its receipt and timetable below; current checks are shown separately."
            : "Check what is ready, what needs your action and which office owns the next step before submitting registration."}
        </p>
      </header>
      <RegistrationSteps current="readiness" context={board} />
      <ContextSelector
        inventory={await loadRegistrationContexts()}
        path="/student/readiness"
        current={{ attemptId: board.attemptId, period: board.period }}
      />
      <Notice
        severity={banner.severity}
        title={banner.title}
        message={
          registration
            ? `Your official registration for ${board.period} is complete. Current window or hold checks may affect later changes; they do not cancel this registration.`
            : receiptUnavailable
              ? "The official receipt could not be confirmed for this study context. Open registration to check the current record before taking further action."
              : `Assessed ${formatLusaka(board.assessedAt)}. Each check shows the next action and responsible office.`
        }
      />
      {registration ? (
        <>
          <section
            className={styles.receipt}
            aria-labelledby="readiness-receipt-title"
          >
            <h2 id="readiness-receipt-title">Registration receipt</h2>
            <dl className={styles.receiptFacts}>
              <div>
                <dt>Registration reference</dt>
                <dd>{registration.receipt}</dd>
              </div>
              <div>
                <dt>Academic period</dt>
                <dd>{registration.period}</dd>
              </div>
              <div>
                <dt>Registered on</dt>
                <dd>
                  <time dateTime={registration.decidedAt}>
                    {formatLusaka(registration.decidedAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Registered courses</dt>
                <dd>{registration.courses.length}</dd>
              </div>
            </dl>
            <div className={workflow.actions}>
              <a
                className={workflow.action}
                href={academicHref("/student/timetable", board)}
              >
                View timetable
              </a>
              <a
                className={`${workflow.action} ${workflow.secondary}`}
                href={academicHref("/student/register", board)}
              >
                View registration receipt
              </a>
            </div>
          </section>
          <details className={`${workflow.panel} ${styles.currentChecks}`}>
            <summary>Current checks and next steps</summary>
            <div className={styles.checksBody}>
              <p className={study.muted}>
                {board.conditions.length} current checks · Assessed{" "}
                {formatLusaka(board.assessedAt)}. These checks describe current
                conditions and later actions; the official receipt above
                establishes this registration.
              </p>
              <ReadinessConditions conditions={board.conditions} />
            </div>
          </details>
        </>
      ) : (
        <>
          <div className={workflow.actions}>
            <a
              className={workflow.action}
              href={academicHref("/student/courses", board)}
            >
              Plan your courses
            </a>
            <a
              className={`${workflow.action} ${workflow.secondary}`}
              href={academicHref("/student/register", board)}
            >
              Review registration
            </a>
          </div>
          <ReadinessConditions conditions={board.conditions} />
        </>
      )}
      {board.pendingRegulations.length > 0 ? (
        <details className={workflow.panel}>
          <summary>Regulations requiring review</summary>
          <p className={workflow.meta}>{board.pendingRegulations.join(", ")}</p>
        </details>
      ) : null}
    </div>
  );
}
