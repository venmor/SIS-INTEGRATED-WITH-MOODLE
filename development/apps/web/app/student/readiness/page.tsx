import type { ReadinessView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Icon, Notice, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import styles from "../student.module.css";

async function loadReadiness(
  query: string,
): Promise<{ data: ReadinessView | null; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Freadiness");
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/readiness${query}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401) redirect("/sign-in?returnTo=%2Fstudent%2Freadiness");
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

const OVERALL: Record<string, { title: string; severity: "success" | "info" | "warning" }> = {
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
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  const r = await loadReadiness(query);
  if (!r.data) return <StudentUnavailable message={r.message} />;
  const board = r.data;
  const banner = OVERALL[board.overall] ?? {
    title: board.overall,
    severity: "info" as const,
  };
  return (
    <>
      <p className={styles.meta}>Registration readiness · {board.period}</p>
      <div className={styles.sectionHeading}>
        <Icon name="readiness" size={22} />
        <h1>Registration readiness</h1>
      </div>
      <Notice
        severity={banner.severity}
        title={banner.title}
        message={`Assessed ${formatLusaka(board.assessedAt)}.`}
      />
      <ul className={styles.readinessList} aria-label="Readiness conditions">
        {board.conditions.map((condition) => (
          <li className={styles.readinessItem} key={condition.key}>
            <div className={styles.readinessTop}>
              <strong>{condition.label}</strong>
              <StatusChip
                tone={
                  condition.status === "SATISFIED"
                    ? "success"
                    : condition.status === "BLOCKED"
                      ? "attention"
                      : "info"
                }
              >
                {condition.status}
              </StatusChip>
            </div>
            <dl className={styles.readinessMeta}>
              <div>
                <dt>Owner</dt>
                <dd>{condition.owner}</dd>
              </div>
              <div>
                <dt>Current state</dt>
                <dd>{condition.detail}</dd>
              </div>
              <div>
                <dt>Next step</dt>
                <dd>{condition.next}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      {board.pendingRegulations.length > 0 ? (
        <Notice
          severity="info"
          title="Academic review"
          message={`Open regulation boundaries: ${board.pendingRegulations.join(", ")}.`}
        />
      ) : null}
    </>
  );
}
