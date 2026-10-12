import { RegistrationSteps, CourseSummary } from "../../components/task-flow";
import { createHash } from "node:crypto";
import type { CoursePlanView, RegistrationStatusView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import { parseAcademicContext } from "../../../lib/academic-context";
import { RegisterForm } from "./form";
import styles from "../../applicant/applicant.module.css";

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
  } catch {
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
        <p className={styles.eyebrow}>Formal registration</p>
        <h1>Review registration</h1>
        <StudentUnavailable message={plan.message} />
      </>
    );
  return (
    <>
      <p className={styles.eyebrow}>Formal registration · {plan.data.period}</p>
      <h1>Review registration</h1>
      <RegistrationSteps current="review" context={plan.data} />
      {!status.data ? (
        <Notice
          severity="warning"
          title="Registration status unavailable"
          message={`${status.message} Check your status before submitting again.`}
        />
      ) : status.data.registration ? (
        <>
          <Notice
            severity="success"
            title="Registration completed"
            message={`Receipt ${status.data.registration.receipt}. Your official course registration is complete.`}
          />
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
          <h2>Registered courses</h2>
          <CourseSummary
            courses={status.data.registration.courses}
            caption="Officially registered courses"
          />
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
    </>
  );
}
