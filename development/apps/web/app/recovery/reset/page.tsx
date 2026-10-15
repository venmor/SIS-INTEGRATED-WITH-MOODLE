import { PublicHeader } from "../../public-header";
import task from "../../sign-in/sign-in.module.css";
import { Suspense } from "react";
import { SECURITY_V1 } from "@sis/config";
import styles from "../../page.module.css";
import { ResetForm } from "./form";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <>
      <PublicHeader />
      <div className={styles.page}>
        <main id="main-content" tabIndex={-1} className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Choose a new password</h1>
          <p className={styles.lede}>
            Links are single-use and expire after{" "}
            {SECURITY_V1.recoveryTokenMinutes} minutes.
          </p>
          <section aria-label="New password" className={task.form}>
            <Suspense fallback={<p role="status">Loading password form…</p>}>
              <ResetForm />
            </Suspense>
          </section>
        </main>
      </div>
    </>
  );
}
