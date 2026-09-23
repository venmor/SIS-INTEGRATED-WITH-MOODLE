import type { AmendmentView, WaitlistView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StudentUnavailable } from "../chrome";
import { Notice } from "@sis/ui";
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
    if (response.status === 401) redirect("/sign-in?returnTo=%2Fstudent%2Fchanges");
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
    return <StudentUnavailable message={amendments.message || waitlist.message} />;
  return (
    <>
      <p className={styles.eyebrow}>Course changes</p>
      <h1>Course changes</h1>
      <p className={styles.muted}>
        Required courses cannot be dropped here — request academic advice
        through a support ticket. Adding a course revalidates prerequisites,
        capacity, load and finance before anything is recorded.
      </p>
      <ChangeForms />
      <h2>Change history</h2>
      {amendments.data.items.length === 0 ? (
        <Notice
          severity="info"
          title="No changes"
          message="Approved and pending change requests appear here with their versions."
        />
      ) : (
        <ul>
          {amendments.data.items.map((amendment) => (
            <li key={amendment.id}>
              <p>
                <strong>
                  {amendment.kind} {amendment.courseCode}
                </strong>{" "}
                — v{amendment.version} · {amendment.status}
              </p>
              <p className={styles.muted}>
                {amendment.courseTitle} · Requested{" "}
                {formatLusaka(amendment.createdAt)}
              </p>
              <p>{amendment.reason}</p>
            </li>
          ))}
        </ul>
      )}
      <h2>Waitlist</h2>
      {waitlist.data.items.length === 0 ? (
        <p className={styles.muted}>
          No waitlist entries. Join from the form above when a course is full.
        </p>
      ) : (
        <ul>
          {waitlist.data.items.map((entry) => (
            <li key={entry.id}>
              <p>
                <strong>{entry.courseCode}</strong> — position {entry.position}{" "}
                · {entry.status}
              </p>
              <p className={styles.muted}>
                {entry.courseTitle}
                {entry.expiresAt
                  ? ` · Expires ${formatLusaka(entry.expiresAt)}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
