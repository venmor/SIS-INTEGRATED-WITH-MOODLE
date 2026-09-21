import Link from "next/link";
import styles from "../page.module.css";
import signInStyles from "./sign-in.module.css";
import { SignInForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  // Only the explicitly configured fictional environment advertises seed access.
  const demoAccount = process.env.DEMO_MODE === "true"
    ? { username: "bwalya.m", password: "Seed-2026-Bwalya" }
    : undefined;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link className={signInStyles.backLink} href="/discover">
          ← Browse programmes
        </Link>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>Use your SIS username and password.</p>
        <SignInForm returnTo={returnTo} demoAccount={demoAccount} />
      </main>
    </div>
  );
}
