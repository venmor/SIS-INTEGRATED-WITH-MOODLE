import { loadApplicant } from "../../server";
import { ApplicationCaseNav, ApplicationUnavailable } from "../../chrome";
import { WithdrawForm } from "./withdraw-form";
import styles from "../../applicant.module.css";

export default async function WithdrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<{
    reference: string;
    state: string;
    version: number;
  }>(`/${id}/timeline`, `/applicant/${id}/withdraw`);
  if (!r.data) return <ApplicationUnavailable message={r.message} />;
  if (r.data.state !== "Submitted") {
    return (
      <>
        <p className={styles.eyebrow}>Application {r.data.reference}</p>
        <h1>Withdraw application</h1>
        <p>
          Only a submitted application awaiting decision can be withdrawn
          here. The timeline shows the current state.
        </p>
        <ApplicationCaseNav applicationId={id} />
      </>
    );
  }
  return (
    <>
      <p className={styles.eyebrow}>Application {r.data.reference}</p>
      <h1>Withdraw application</h1>
      <p className={styles.lede}>
        Withdrawing ends assessment of this application. Records stay under
        the configured retention policy. Withdrawing does not request a
        refund; that is a separate Finance process.
      </p>
      <WithdrawForm
        applicationId={id}
        reference={r.data.reference}
        version={r.data.version}
      />
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
