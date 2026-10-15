import type { AmendmentView, WaitlistView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Card, DataTable, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import { ChangeForms } from "./forms";
import styles from "../../applicant/applicant.module.css";

async function loadRegistration<T>(
  path: string,
): Promise<{ data: T | null; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Fchanges");
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
      redirect("/sign-in?returnTo=%2Fstudent%2Fchanges");
    if (!response.ok)
      return {
        data: null,
        message:
          ((await response.json().catch(() => ({}))) as { message?: string })
            .message ?? "Course changes are unavailable right now.",
      };
    return { data: (await response.json()) as T, message: "" };
  } catch {
    return {
      data: null,
      message:
        "We cannot reach the registration service. Your record is kept. Try again shortly.",
    };
  }
}

// Course changes: previews name academic and financial impact before
// confirm; self-service completes only when every check passes, otherwise an
// approval task with reason and evidence goes to the configured authority.
// Snapshots stay immutable; every change is a versioned amendment.
export default async function ChangesPage() {
  const [amendments, waitlist] = await Promise.all([
    loadRegistration<{ items: AmendmentView[] }>("/amendments"),
    loadRegistration<{ items: WaitlistView[] }>("/waitlist"),
  ]);
  if (!amendments.data || !waitlist.data)
    return (
      <StudentUnavailable message={amendments.message || waitlist.message} />
    );
  return (
    <>
      <p className={styles.eyebrow}>Course changes</p>
      <h1>Course changes</h1>
      <p className={styles.muted}>
        Required courses cannot be dropped here — request academic advice
        through a support ticket. Registry checks prerequisites, capacity, load
        and timetable compatibility before approval. Approved changes update
        your finance account. Class meeting times are not yet published.
      </p>
      <ChangeForms />
      <Card>
        <DataTable
          title="Change history"
          description="Your course-change requests and their current decisions."
          rows={amendments.data.items}
          keyOf={(item) => item.id}
          emptyText="No course-change requests yet."
          columns={[
            {
              heading: "Course",
              render: (item) => (
                <>
                  <strong>{item.courseCode}</strong>
                  <br />
                  {item.courseTitle}
                </>
              ),
            },
            {
              heading: "Request",
              render: (item) => (
                <>
                  {item.kind} · Version {item.version}
                  <br />
                  {item.reason}
                </>
              ),
            },
            {
              heading: "Status",
              render: (item) => (
                <StatusChip tone="neutral">{item.status}</StatusChip>
              ),
            },
            {
              heading: "Requested",
              render: (item) => formatLusaka(item.createdAt),
            },
          ]}
        />
      </Card>
      <Card>
        <DataTable
          title="Waitlist"
          description="Course places you have requested. A waitlist place does not register the course."
          rows={waitlist.data.items}
          keyOf={(item) => item.id}
          emptyText="No waitlist entries. Join a waitlist above when a course is full."
          columns={[
            {
              heading: "Course",
              render: (item) => (
                <>
                  <strong>{item.courseCode}</strong>
                  <br />
                  {item.courseTitle}
                </>
              ),
            },
            { heading: "Position", render: (item) => item.position },
            {
              heading: "Status",
              render: (item) => (
                <StatusChip tone="neutral">{item.status}</StatusChip>
              ),
            },
            {
              heading: "Expires",
              render: (item) =>
                item.expiresAt
                  ? formatLusaka(item.expiresAt)
                  : "No expiry recorded",
            },
          ]}
        />
      </Card>
    </>
  );
}
