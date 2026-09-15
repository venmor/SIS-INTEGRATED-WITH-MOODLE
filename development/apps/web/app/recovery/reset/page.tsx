import { Suspense } from "react";
import { SECURITY_V1 } from "@sis/config";
import styles from "../../page.module.css";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Choose a new password</h1>
        <p className={styles.lede}>
          Links are single-use and expire after {SECURITY_V1.recoveryTokenMinutes} minutes.
        </p>
        <Suspense>
          <ResetForm />
        </Suspense>
      </main>
    </div>
  );
}
