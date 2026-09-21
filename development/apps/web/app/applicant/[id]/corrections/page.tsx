import type { CorrectionRequestView } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationCaseNav, ApplicationUnavailable } from "../../chrome";
import { formatLusaka } from "../../../../lib/time";
import { CorrectionForm } from "./correction-form";
import styles from "../../applicant.module.css";

export default async function CorrectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<{ items: CorrectionRequestView[] }>(
    `/${id}/corrections`,
    `/applicant/${id}/corrections`,
  );
  if (!r.data) return <ApplicationUnavailable message={r.message} />;
  const timeline = await loadApplicant<{ version: number }>(
    `/${id}/timeline`,
    `/applicant/${id}/corrections`,
  );
  const version = timeline.data?.version ?? 1;
  return (
    <>
      <p className={styles.eyebrow}>Submitted application</p>
      <h1>Correction requests</h1>
      <p className={styles.lede}>
        The submitted application stays unchanged until Admissions approves a
        request. One open request per item.
      </p>
      <CorrectionForm applicationId={id} version={version} />
      {r.data.items.length > 0 ? (
        <>
          <h2>Existing requests</h2>
          <ul>
            {r.data.items.map((item) => (
              <li key={item.id} className={styles.card}>
                <p>
                  <strong>
                    {item.section} · {item.field}
                  </strong>{" "}
                  — {item.status}
                </p>
                <p className={styles.muted}>
                  Requested {formatLusaka(item.createdAt)}
                  {item.decidedAt
                    ? ` · decided ${formatLusaka(item.decidedAt)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
