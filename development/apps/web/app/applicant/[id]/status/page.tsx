import Link from "next/link";
import type { ApplicantTimeline } from "@sis/contracts";
import { Status } from "@sis/ui";
import { loadApplicant } from "../../server";
import { ApplicationUnavailable, ApplicationCaseNav } from "../../chrome";
import { formatLusaka } from "../../../../lib/time";
import styles from "../../applicant.module.css";

const STATE_LABELS: Record<string, string> = {
  Submitted: "Application received",
  Withdrawn: "Application withdrawn",
};

export default async function StatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<ApplicantTimeline>(
    `/${id}/timeline`,
    `/applicant/${id}/status`,
  );
  if (!r.data) return <ApplicationUnavailable message={r.message} />;

  const timeline = r.data;
  const currentLabel =
    STATE_LABELS[timeline.state] ?? `Application ${timeline.state}`;
  const latestEvent = timeline.events.at(-1) ?? null;

  return (
    <>
      <p className={styles.eyebrow}>Application {timeline.reference}</p>
      <h1>{currentLabel}</h1>
      <Status
        severity={timeline.state === "Withdrawn" ? "neutral" : "info"}
        state={currentLabel}
        reason={
          timeline.state === "Withdrawn"
            ? "This application was withdrawn."
            : "Admissions received your application."
        }
        updated={
          latestEvent ? formatLusaka(latestEvent.occurredAt) : undefined
        }
        owner={timeline.state === "Withdrawn" ? undefined : "Admissions"}
        action="Check the timeline for updates."
      />

      <h2>Application timeline</h2>
      {timeline.events.length === 0 ? (
        <p>No updates yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {timeline.events.map((event) => (
            <li key={event.id}>
              <p>
                <strong>{event.label}</strong>
              </p>
              <p className={styles.muted}>
                {formatLusaka(event.occurredAt)} · {event.actorRole}
              </p>
              {event.detail ? <p>{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      )}

      <p>
        <Link href={`/applicant/${timeline.applicationId}`}>
          Return to application
        </Link>
      </p>
      <ApplicationCaseNav applicationId={timeline.applicationId} />
    </>
  );
}
