import { RegistrationSteps, CourseSummary } from "../../components/task-flow";
import { loadRegistrationContexts } from "../../../lib/load-registration-contexts";
import { ContextSelector } from "../context-selector";
import { MoodleAccess } from "../moodle-access";
import type { CoursePlanView, RegistrationStatusView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import {
  parseAcademicContext,
  academicHref,
} from "../../../lib/academic-context";
import { PlanBoard } from "./board";
import study from "../study-workflows.module.css";

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
  } catch (error) {
    // Next redirects are control flow, not registration-service outages.
    if (error && typeof error === "object" && "digest" in error) throw error;
    return {
      data: null,
      message:
        "We cannot reach the registration service. Your saved plan is kept. Try again shortly.",
    };
  }
}

async function loadAccess(query: string): Promise<RegistrationStatusView['moodle']['access'] | null> {
  const sid=(await cookies()).get('sid')?.value;
  if (!sid) return null;
  try {
    const r=await fetch(`${process.env.API_INTERNAL_URL ?? 'http://localhost:3001'}/registration/status${query}`, { headers:{cookie:`sid=${encodeURIComponent(sid)}`},cache:'no-store',signal:AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    return ((await r.json()) as RegistrationStatusView).moodle.access ?? null;
  } catch { return null; }
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
  const access=await loadAccess(`?${new URLSearchParams({attemptId:board.attemptId,period:board.period})}`);
  return (
    <div className={study.page}>
      <header className={study.intro}>
        <p className={study.eyebrow}>Course selection · {board.period}</p>
        <h1>{board.status === "DRAFT" || board.status === "NONE" ? "Choose courses" : "My courses"}</h1>
        <p className={study.muted}>
          {board.status === "DRAFT" || board.status === "NONE"
            ? "Choose required courses and electives, then save your draft before final registration."
            : "These courses are read-only here. Use the registration receipt for the official record and course changes for amendments."}
        </p>
      </header>
      {board.status === "DRAFT" || board.status === "NONE" ? (
        <RegistrationSteps current="courses" context={board} />
      ) : null}
      {access ? <MoodleAccess access={access} /> : <Notice severity="info" title="Moodle course access" message={board.status === "DRAFT" || board.status === "NONE" ? "Complete registration to receive access to your Moodle courses." : "Moodle access is being checked. Your registration remains valid."} />}
      <ContextSelector
        inventory={await loadRegistrationContexts()}
        path="/student/courses"
        current={board}
      />
      {board.status === "DRAFT" || board.status === "NONE" ? (
        <PlanBoard initial={board} />
      ) : (
        <>
          <Notice
            severity="info"
            title="Course plan is read-only"
            message="This plan has already been submitted or needs review. Open registration to check its official status. Course changes follow the approved change process."
          />
          <CourseSummary
            courses={board.items}
            caption="Saved course plan (read-only)"
          />
          <p>
            <a href={academicHref("/student/register", board)}>
              Review registration
            </a>
          </p>
        </>
      )}
    </div>
  );
}
