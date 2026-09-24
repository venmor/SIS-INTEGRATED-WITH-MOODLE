import type { CoursePlanView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice, PageHeader } from "@sis/ui";
import { PlanBoard } from "./board";

async function loadPlan(): Promise<{
  data: CoursePlanView | null;
  message: string;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Fcourses");
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/plan`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401) redirect("/sign-in?returnTo=%2Fstudent%2Fcourses");
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
export default async function CoursesPage() {
  const r = await loadPlan();
  if (!r.data) return <StudentUnavailable message={r.message} />;
  const board = r.data;
  return (
    <>
      <PageHeader
        eyebrow={`Course selection · ${board.period}`}
        title="Plan your courses"
        lede="Required, new and elective courses are separated. Saving keeps a draft; formal registration is a separate submission."
      />
      {board.status !== "NONE" ? (
        <Notice
          severity="info"
          title="Draft saved"
          message={`Version ${board.version}. Saving again replaces the draft and bumps the version.`}
        />
      ) : null}
      <PlanBoard initial={board} />
    </>
  );
}
