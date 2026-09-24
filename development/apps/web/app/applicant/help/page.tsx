import Link from "next/link";
import styles from "../applicant.module.css";

export default function Help() {
  return (
    <>
      <h1>Application help</h1>
      <p>
        Find guidance for completing your application and submitting supporting documents.
      </p>
      <section className={styles.card}>
        <h2>Saving progress</h2>
        <p>
          Your draft is saved on the server after selecting Save. If a connection issue occurs, check your saved result before retrying.
        </p>
        <h2>Document submission</h2>
        <p>
          Uploaded documents undergo integrity and file safety verification before staff review. Ensure all scans are clear and readable.
        </p>
        <h2>Contacting support</h2>
        <p>
          For assistance, contact Admissions through published institutional support channels. Include your application reference in correspondence.
        </p>
      </section>
      <div className={styles.actions}>
        <Link href="/applicant">Return to my applications</Link>
      </div>
    </>
  );
}
