import styles from "../page.module.css";
import { RecoveryForm } from "./form";

export const dynamic = "force-dynamic";

export default function RecoveryPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Recover account access</h1>
        <p className={styles.lede}>
          Enter your username. The reply is always the same whether the account exists or not.
        </p>
        <RecoveryForm />
      </main>
    </div>
  );
}
