import styles from "../page.module.css";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>Use your SIS username and password.</p>
        <SignInForm />
      </main>
    </div>
  );
}
