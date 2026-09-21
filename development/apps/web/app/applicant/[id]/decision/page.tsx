import Link from "next/link";
import type { DecisionView } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationCaseNav } from "../../chrome";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import styles from "../../applicant.module.css";

// Decision viewing: deliberate authenticated open only. A missing decision
// is a neutral absence, never a verdict; notices never carry the outcome.
export default async function DecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<DecisionView>(
    `/${id}/decision`,
    `/applicant/${id}/decision`,
  );
  if (!r.data) {
    return (
      <>
        <p className={styles.eyebrow}>Submitted application</p>
        <h1>Admission decision</h1>
        <Notice
          severity="info"
          title="No decision yet"
          message="No admission decision is available for this application yet. The timeline shows assessment progress."
        />
        <ApplicationCaseNav applicationId={id} />
      </>
    );
  }
  const decision = r.data;
  return (
    <>
      <p className={styles.eyebrow}>Application {decision.reference}</p>
      <h1>Admission decision</h1>
      <p className={styles.muted}>
        Decided {formatLusaka(decision.decidedAt)}. Opened by you just now;
        this page is never previewed in notifications.
      </p>
      {decision.outcome === "OFFERED" ? (
        <>
          <h2>You have received an admission offer</h2>
          <p>{decision.message}</p>
          {decision.conditions.length > 0 ? (
            <>
              <h3>Conditions</h3>
              <ul>
                {decision.conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : decision.outcome === "WAITLISTED" ? (
        <>
          <h2>Your application is on the waiting list</h2>
          <p>{decision.message}</p>
        </>
      ) : (
        <>
          <h2>Admission decision</h2>
          <p>{decision.message}</p>
        </>
      )}
      <p>
        <Link href={`/applicant/${id}/tickets`}>Ask about this decision</Link>
      </p>
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
