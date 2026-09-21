import Link from "next/link";
import type { ApplicantTimeline } from "@sis/contracts";
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
  return (
    <>
      <p className={styles.eyebrow}>Application {timeline.reference}</p>
      <h1>
        {STATE_LABELS[timeline.state] ?? `Application ${timeline.state}`}
      </h1>
      {timeline.events.length === 0 ? (
        <p>No timeline events yet. Submitted applications record here.</p>
      ) : (
        <ol>
          {timeline.events.map((event) => (
            <li key={event.id} className={styles.card}>
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
