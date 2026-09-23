import type {
  StudentCorrectionView,
  StudentHomeView,
} from "@sis/contracts";
import Link from "next/link";
import { loadStudent } from "./server";
import { StudentUnavailable } from "./chrome";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import { ContactForm, CorrectionForm } from "./forms";
import styles from "../applicant/applicant.module.css";

// Student portal home: welcome with number/programme/period, onboarding
// remainder carried from applicant life, contact and correction workflows.
// Converting never shows a blank portal; reconciling states explain instead.
export default async function StudentPage() {
  const home = await loadStudent<StudentHomeView>("/me/home", "/student");
  if (!home.data) return <StudentUnavailable message={home.message} />;
  const board = home.data;
  const corrections =
    await loadStudent<{ items: StudentCorrectionView[] }>(
      "/me/corrections",
      "/student",
    );
  return (
    <>
      <p className={styles.eyebrow}>Accepted applicant onboarding</p>
      <h1>Welcome to the student portal</h1>
      <p>
        {board.displayName} · Student number {board.studentNumber}
      </p>
      <p className={styles.muted}>
        {board.programmeName} · {board.intake} · {board.campus} ·{" "}
        {board.studyMode} · Period {board.period}
      </p>
      <p className={styles.muted}>
        Registration opens{" "}
        {board.registrationOpensAt
          ? formatLusaka(board.registrationOpensAt)
          : "on a date to be announced"}
        {board.registrationClosesAt
          ? ` and closes ${formatLusaka(board.registrationClosesAt)}`
          : ""}
        .
      </p>
      <h2>Onboarding remainder</h2>
      <p>
        <Link href="/student/courses">Plan your courses</Link> ·{" "}
        <Link href="/student/readiness">Registration readiness</Link> ·{" "}
        <Link href="/student/register">Review and submit registration</Link> ·{" "}
        <Link href="/student/changes">Course changes</Link> ·{" "}
        <Link href="/student/finance">Finance and clearance</Link>
      </p>      <p>
        {board.onboardingRequiredComplete} of {board.onboardingRequiredTotal}{" "}
        required applicant tasks complete.
        {board.pendingCorrections > 0 ? (
          <>
            {" "}
            {board.pendingCorrections} correction request
            {board.pendingCorrections === 1 ? "" : "s"} awaiting review.
          </>
        ) : null}
      </p>
      <h2>Contact details</h2>
      <ContactForm />
      <h2>Request an official record correction</h2>
      <p className={styles.muted}>
        Corrections are reviewed by the records office. The current record
        stays unchanged until approval, and approvals record old and new
        values.
      </p>
      <CorrectionForm />
      <h2>Correction history</h2>
      {!corrections.data || corrections.data.items.length === 0 ? (
        <Notice
          severity="info"
          title="No corrections"
          message="No record correction requests yet."
        />
      ) : (
        <ul>
          {corrections.data.items.map((correction) => (
            <li key={correction.id}>
              <strong>
                {correction.field} · {correction.status}
              </strong>{" "}
              — {correction.requestedValue}
              <br />
              {correction.reason}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
