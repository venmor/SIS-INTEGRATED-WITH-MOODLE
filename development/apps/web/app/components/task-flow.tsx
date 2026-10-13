import Link from "next/link";
import { academicHref } from "../../lib/academic-context";
import styles from "./workflow.module.css";

/** Location in a workflow, not evidence that an earlier step is complete. */
export function RegistrationSteps({
  current,
  context,
}: {
  current: "courses" | "readiness" | "review";
  context: { attemptId?: string; period?: string };
}) {
  const steps = [
    { key: "courses", label: "Choose courses", href: "/student/courses" },
    { key: "readiness", label: "Check readiness", href: "/student/readiness" },
    { key: "review", label: "Review and submit", href: "/student/register" },
  ];
  return (
    <nav aria-label="Registration steps">
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.key}>
            <Link
              href={academicHref(step.href, context)}
              aria-current={current === step.key ? "step" : undefined}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CourseSummary({
  courses,
  caption,
}: {
  courses: Array<{
    code: string;
    title: string;
    credits?: number;
    courseType?: string;
    semester?: string | null;
  }>;
  caption: string;
}) {
  return (
    <table className={styles.table}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Course</th>
          <th scope="col">Title</th>
          <th scope="col">Details</th>
        </tr>
      </thead>
      <tbody>
        {courses.map((course) => (
          <tr key={course.code}>
            <th scope="row" data-label="Course">
              {course.code}
            </th>
            <td data-label="Title">{course.title}</td>
            <td data-label="Details">
              {[
                course.credits == null ? null : `${course.credits} credits`,
                course.courseType,
                course.semester,
              ]
                .filter(Boolean)
                .join(" · ") || "Not specified"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
