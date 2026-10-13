import { loadRegistrationContexts } from "../../../lib/load-registration-contexts";
import { ContextSelector } from "../context-selector";
import type { CoursePlanView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import {
  parseAcademicContext,
  academicHref,
} from "../../../lib/academic-context";
import { PlanBoard } from "./board";
import styles from "../../applicant/applicant.module.css";

async function loadPlan(query: string): Promise<{
  data: CoursePlanView | null;
  message: string;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid)
    redirect(
      `/sign-in?returnTo=${encodeURIComponent(`/student/courses${query}`)}`,
    );
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/plan${query}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401)
      redirect(
        `/sign-in?returnTo=${encodeURIComponent(`/student/courses${query}`)}`,
      );
    if (!response.ok)
      return {
        data: null,
        message:
          ((await response.json().catch(() => ({}))) as { message?: string })
            .message ?? "Course planning is unavailable right now.",
      };
    return { data: (await response.json()) as CoursePlanView, message: "" };
  } catch {
    return {
      data: null,
      message:
        "We cannot reach the registration service. Your saved plan is kept. Try again shortly.",
    };
  }
}

// Plan your courses: draft course selection with per-course validation.
// Saving is draft-only; nothing official happens here. Official submission
// happens at formal registration.
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    attemptId?: string | string[];
    period?: string | string[];
  }>;
}) {
  const context = parseAcademicContext(await searchParams);
  if (!context.valid)
    return (
      <StudentUnavailable message="Choose a valid study period before planning courses." />
    );
  const r = await loadPlan(context.query.size ? `?${context.query}` : "");
  if (!r.data) return <StudentUnavailable message={r.message} />;
  const board = r.data;
  return (
    <>
      <p className={styles.eyebrow}>Course selection · {board.period}</p>
      <h1>Plan your courses</h1>
      <ContextSelector inventory={await loadRegistrationContexts()} path="/student/courses" current={board} />
      <p className={styles.muted}>
        Required courses, new courses and electives are listed separately.
        Unavailable courses name their reason. Saving keeps a draft; submit
        happens at formal registration.
      </p>
      {board.status === "DRAFT" ? (
        <Notice
          severity="info"
          title="Draft saved"
          message={`Version ${board.version}. Saving again replaces the draft and bumps the version.`}
        />
      ) : null}
      {board.status === "DRAFT" || board.status === "NONE" ? <PlanBoard initial={board} /> : <>
        <Notice severity="info" title="Course plan is read-only" message="This plan has already been submitted or needs review. Open registration to check its official status. Course changes follow the approved change process." />
        <ul>{board.items.map(item => <li key={item.courseId}><strong>{item.code}</strong> — {item.title}</li>)}</ul>
      </>}
      <p>
        <a href={academicHref("/student/register", board)}>
          Review registration
        </a>
      </p>
    </>
  );
}
