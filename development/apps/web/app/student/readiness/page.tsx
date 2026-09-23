import type { ReadinessView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import styles from "../../applicant/applicant.module.css";

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
      <p className={styles.eyebrow}>Registration readiness · {board.period}</p>
      <h1>Registration readiness</h1>
      <Notice
        severity={banner.severity}
        title={banner.title}
        message={`Assessed ${formatLusaka(board.assessedAt)}. Open regulation boundaries route to academic decisions: ${board.pendingRegulations.join(", ")}.`}
      />
      <ul>
        {board.conditions.map((condition) => (
          <li key={condition.key}>
            <p>
              <strong>{condition.label}</strong> — {condition.status}
            </p>
            <p className={styles.muted}>
              Owner: {condition.owner} · {condition.detail}
            </p>
            <p>{condition.next}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
