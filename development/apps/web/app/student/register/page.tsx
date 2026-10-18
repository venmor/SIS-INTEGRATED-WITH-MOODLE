import { RegistrationSteps } from "../../components/task-flow";
import { loadRegistrationContexts } from "../../../lib/load-registration-contexts";
import { ContextSelector } from "../context-selector";
import { createHash } from "node:crypto";
import type { CoursePlanView, RegistrationStatusView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import { parseAcademicContext } from "../../../lib/academic-context";
import { RegisterForm } from "./form";
import study from "../study-workflows.module.css";
import { RegistrationReceipt } from "./receipt";
import { MoodleAccess } from "../moodle-access";

async function loadRegistration<T>(
  path: string,
  returnTo: string,
): Promise<{ data: T | null; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration${path}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401)
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    if (!response.ok)
      return {
        data: null,
        message:
          ((await response.json().catch(() => ({}))) as { message?: string })
            .message ?? "Registration is unavailable right now.",
      };
    return { data: (await response.json()) as T, message: "" };
  } catch (error) {
    // Preserve expired-session sign-in and its exact academic return context.
    if (error && typeof error === "object" && "digest" in error) throw error;
    return {
      data: null,
      message:
        "We cannot reach the registration service. Your saved plan is kept. Try again shortly.",
    };
  }
}

// Review registration for the period: validated plan, clearance state,
// deadline, declarations, then one formal submit. Success shows the
// immutable receipt; the timetable derives from registered courses.
export default async function RegisterPage({
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
      <StudentUnavailable message="Choose a valid study period before reviewing registration." />
    );
  const query = context.query.size ? `?${context.query}` : "";
  const [plan, status] = await Promise.all([
    loadRegistration<CoursePlanView>(
      `/plan${query}`,
      `/student/register${query}`,
    ),
    loadRegistration<RegistrationStatusView>(
      `/status${query}`,
      `/student/register${query}`,
    ),
  ]);
  if (!plan.data)
    return (
      <>
        <p className={study.eyebrow}>Formal registration</p>
        <h1>Review registration</h1>
        <StudentUnavailable message={plan.message} />
      </>
    );
  return (
    <div className={study.page}>
      <header className={study.intro}>
        <p className={study.eyebrow}>
          Formal registration · {plan.data.period}
        </p>
        <h1>Review registration</h1>
        <p className={study.muted}>
          {status.data?.registration
            ? "Your official registration receipt and registered courses for this period. Timetable publication and learning access are shown separately."
            : "Review your saved courses and current checks, then accept the required declarations to submit your registration."}
        </p>
      </header>
      {!status.data?.registration ? (
        <RegistrationSteps current="review" context={plan.data} />
      ) : null}
      <ContextSelector
        inventory={await loadRegistrationContexts()}
        path="/student/register"
        current={plan.data}
      />
      {!status.data ? (
        <Notice
          severity="warning"
          title="Registration status unavailable"
          message={`${status.message} Check your status before submitting again.`}
        />
      ) : status.data.registration ? (
        <>
          <RegistrationReceipt receipt={status.data.registration} />
          <Notice
            severity={
              status.data.moodle.state === "Synced" ? "success" : "info"
            }
            title={
              status.data.moodle.state === "NOT_PROVISIONED"
                ? "Moodle access is being prepared"
                : `Moodle handoff: ${status.data.moodle.state}`
            }
            message={status.data.moodle.detail}
          />
          {status.data.moodle.access ? <MoodleAccess access={status.data.moodle.access} /> : null}
        </>
      ) : (
        <RegisterForm
          initial={plan.data}
          recoveryScope={createHash("sha256")
            .update(
              `${(await cookies()).get("sid")?.value}:${plan.data.attemptId}:${plan.data.period}`,
            )
            .digest("hex")}
        />
      )}
    </div>
  );
}
