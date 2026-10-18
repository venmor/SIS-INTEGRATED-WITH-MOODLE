import type { StudentContactView, StudentCorrectionView, StudentHomeView } from "@sis/contracts";
import { Notice, PageHeader, StatusChip } from "@sis/ui";
import { loadStudent } from "../server";
import { StudentUnavailable } from "../chrome";
import { ContactForm, CorrectionForm } from "../forms";
import styles from "../student.module.css";

function fieldLabel(field: string) {
  return field === "displayName" ? "Official name" : field === "email" ? "Email address" : field === "phone" ? "Mobile number" : "Record detail";
}
function correctionStatus(status: string) {
  return status === "PENDING" ? "Awaiting review" : status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Not approved" : "Status unavailable";
}

export default async function AccountPage() {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student/account");
  if (!home.data) return <StudentUnavailable message={home.message} />;
  const [contact, corrections] = await Promise.all([
    loadStudent<StudentContactView>("/me/contact", "/student/account"),
    loadStudent<{ items: StudentCorrectionView[] }>("/me/corrections", "/student/account"),
  ]);
  const board = home.data;
  return (
    <>
      <PageHeader eyebrow="Student account" title="My account" lede="Your student details and requests to update them." />
      <section className={styles.information} aria-labelledby="account-record-title">
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>Official record</p><h2 id="account-record-title">Bio data and status</h2></div><StatusChip tone="info">{board.status.replaceAll("_", " ")}</StatusChip></div>
        <dl className={styles.informationFacts}>
          <div><dt>Official name</dt><dd>{board.displayName}</dd></div>
          <div><dt>Student number</dt><dd>{board.studentNumber}</dd></div>
          <div><dt>Programme</dt><dd>{board.programmeName}</dd></div>
          <div><dt>Intake</dt><dd>{board.intake || "Not recorded"}</dd></div>
          <div><dt>Campus</dt><dd>{board.campus || "Not recorded"}</dd></div>
          <div><dt>Study mode</dt><dd>{board.studyMode || "Not recorded"}</dd></div>
          {contact.data ? <><div><dt>Email</dt><dd>{contact.data.email ?? "Not recorded"}{contact.data.email && !contact.data.emailVerifiedAt ? " · verification needed" : ""}</dd></div><div><dt>Mobile number</dt><dd>{contact.data.phone ?? "Not recorded"}{contact.data.phone && !contact.data.phoneVerifiedAt ? " · verification needed" : ""}</dd></div></> : null}
        </dl>
        {!contact.data ? <Notice severity="warning" title="Contact details unavailable" message={contact.message} /> : null}
      </section>
      <section className={styles.recordSection} aria-labelledby="account-updates-title">
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>Account updates</p><h2 id="account-updates-title">Update your details</h2></div></div>
        <p className={styles.meta}>Contact changes are saved and require channel verification. Official record corrections are submitted for review; your official details remain unchanged until approved.</p>
        <details className={styles.disclosure}><summary>Update contact details</summary><div className={styles.disclosureBody}><ContactForm /></div></details>
        <details className={styles.disclosure}><summary>Request an official record correction</summary><div className={styles.disclosureBody}><CorrectionForm /></div></details>
        <h2>Correction requests</h2>
        {!corrections.data ? <Notice severity="warning" title="History unavailable" message={corrections.message} /> : corrections.data.items.length === 0 ? <p className={styles.meta}>No correction requests yet.</p> : <ul className={styles.history}>{corrections.data.items.map(item => <li key={item.id}><strong>{fieldLabel(item.field)}</strong> · {correctionStatus(item.status)}<p className={styles.meta}>{item.requestedValue} — {item.reason}</p></li>)}</ul>}
      </section>
    </>
  );
}
