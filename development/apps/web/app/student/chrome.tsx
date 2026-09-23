import Link from "next/link";
import { Notice } from "@sis/ui";
import styles from "../applicant/applicant.module.css";

export function StudentUnavailable({ message }: { message: string }) {
  return (
    <>
      <p className={styles.eyebrow}>Student portal</p>
      <h1>Student record unavailable</h1>
      <Notice severity="warning" title="Unavailable" message={message} />
      <p>
        <Link href="/">Return home</Link>
      </p>
    </>
  );
}
