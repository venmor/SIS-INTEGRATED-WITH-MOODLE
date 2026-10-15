import { PublicHeader } from "../public-header";
import task from "../sign-in/sign-in.module.css";
import styles from "../page.module.css";
import { RecoveryForm } from "./form";

export const dynamic = "force-dynamic";

export default function RecoveryPage() {
  return (
    <>
      <PublicHeader />
      <div className={styles.page}>
        <main id="main-content" tabIndex={-1} className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Recover account access</h1>
          <p className={styles.lede}>
            Enter your registered username to receive recovery instructions.
          </p>
          <section aria-label="Account recovery" className={task.form}>
            <RecoveryForm />
          </section>
        </main>
      </div>
    </>
  );
}
