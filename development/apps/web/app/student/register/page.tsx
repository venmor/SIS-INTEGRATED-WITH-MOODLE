import type {
  CoursePlanView,
  RegistrationStatusView,
} from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
import { RegisterForm } from "./form";
import styles from "../../applicant/applicant.module.css";

async function loadRegistration<T>(
  path: string,
): Promise<{ data: T | null; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Fregister");
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration${path}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401) redirect("/sign-in?returnTo=%2Fstudent%2Fregister");
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
export default async function RegisterPage() {
  const [plan, status] = await Promise.all([
    loadRegistration<CoursePlanView>("/plan"),
    loadRegistration<RegistrationStatusView>("/status"),
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
      <p className={styles.eyebrow}>
        Formal registration · {plan.data.period}
      </p>
      <h1>Review registration</h1>
      {status.data?.registration ? (
        <>
          <Notice
            severity="success"
            title="Registration completed"
            message={`Receipt ${status.data.registration.receipt}. Moodle handoff: ${status.data.moodle.state} — ${status.data.moodle.detail}`}
          />
          <h2>Registered courses</h2>
          <ul>
            {status.data.registration.courses.map((course) => (
              <li key={course.code}>
                <strong>{course.code}</strong> — {course.title} (
                {course.courseType}
                {course.semester ? ` · ${course.semester}` : ""})
              </li>
            ))}
          </ul>
        </>
      ) : (
        <RegisterForm initial={plan.data} />
      )}
    </>
  );
}
