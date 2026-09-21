import type { ClarificationView } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationCaseNav, ApplicationUnavailable } from "../../chrome";
import { formatLusaka } from "../../../../lib/time";
import { Notice } from "@sis/ui";
import { RespondForm } from "./respond-form";
import styles from "../../applicant.module.css";

// Clarification list is derived from the timeline-capable case read: open
// and answered requests for this application. Uses the timeline endpoint
// plus a dedicated clarifications read below.
async function loadClarifications(id: string) {
  return loadApplicant<{ items: ClarificationView[] }>(
    `/${id}/clarifications`,
    `/applicant/${id}/clarifications`,
  );
}

export default async function ClarificationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadClarifications(id);
  if (!r.data) return <ApplicationUnavailable message={r.message} />;
  const timeline = await loadApplicant<{ version: number }>(
    `/${id}/timeline`,
    `/applicant/${id}/clarifications`,
  );
  const version = timeline.data?.version ?? 1;
  return (
    <>
      <p className={styles.eyebrow}>Submitted application</p>
      <h1>Clarification requests</h1>
      <p className={styles.lede}>
        Answer only what is asked. Other submitted details cannot change from
        these tasks.
      </p>
      {r.data.items.length === 0 ? (
        <Notice
          severity="info"
          title="No clarification requests"
          message="Admissions has not asked for anything further. The timeline shows assessment progress."
        />
      ) : (
        <ol>
          {r.data.items.map((item) => (
            <li key={item.id} className={styles.card}>
              <p>
                <strong>{item.status === "OPEN" ? "Action needed" : item.status === "ANSWERED" ? "Information received" : "Closed"}</strong>
                {item.deadline
                  ? ` by ${formatLusaka(item.deadline)}`
                  : null}
              </p>
              <p>{item.question}</p>
              {item.status === "OPEN" ? (
                <RespondForm
                  applicationId={id}
                  clarificationId={item.id}
                  version={version}
                />
              ) : (
                <p className={styles.muted}>
                  Answered
                  {item.answeredAt ? ` ${formatLusaka(item.answeredAt)}` : ""}.
                  Admissions will review it and update the status.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
