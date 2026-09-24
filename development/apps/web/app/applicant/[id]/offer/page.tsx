import type { ApplicantOfferView } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationCaseNav } from "../../chrome";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import { OfferForm } from "./offer-form";
import styles from "../../applicant.module.css";

// Admission offer: deliberate authenticated open only. A missing offer is a
// neutral absence, never a verdict; notices never carry the outcome.
export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<ApplicantOfferView>(
    `/${id}/offer`,
    `/applicant/${id}/offer`,
  );
  if (!r.data) {
    return (
      <>
        <p className={styles.eyebrow}>Submitted application</p>
        <h1>Admission offer</h1>
        <Notice
          severity="info"
          title="No offer available"
          message="No admission offer is available for this application. The decision page shows the released outcome."
        />
        <ApplicationCaseNav applicationId={id} />
      </>
    );
  }
  const offer = r.data;
  const answered = offer.response !== null;
  return (
    <>
      <p className={styles.eyebrow}>Application {offer.reference}</p>
      <h1>Admission offer</h1>
      <p>
        {offer.programmeName} · {offer.intake} · {offer.studyMode} ·{" "}
        {offer.campus}
      </p>
      <p className={styles.muted}>
        {offer.message}
      </p>
      <p className={styles.muted}>
        Respond by{" "}
        {offer.acceptBy ? formatLusaka(offer.acceptBy) : "the stated deadline"} (offer version {offer.version}).
        Accepting does not register you; registration opens separately.
      </p>
      {offer.conditions.length > 0 ? (
        <>
          <h2>Conditions</h2>
          <ul>
            {offer.conditions.map((condition) => (
              <li key={condition.text}>
                {condition.text}
                {condition.detail ? <> — {condition.detail}</> : null}
                <br />
                Responsible:{" "}
                {condition.owner === "APPLICANT"
                  ? "You"
                  : condition.owner === "ADMISSIONS"
                    ? "Admissions"
                    : condition.owner === "FINANCE"
                      ? "Finance"
                      : "Responsible office"}
                {condition.deadline ? (
                  <> · meet by {formatLusaka(condition.deadline)}</>
                ) : null}
                {condition.blocksMatriculation ? (
                  <> (required before registration)</>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {answered ? (
        <Notice
          severity="success"
          title={
            offer.response?.decision === "ACCEPT"
              ? "Offer accepted"
              : "Offer declined"
          }
          message={`Recorded ${offer.response ? formatLusaka(offer.response.respondedAt) : ""}. Receipt: ${offer.response?.receipt ?? ""}`}
        />
      ) : (
        <OfferForm offer={offer} />
      )}
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
