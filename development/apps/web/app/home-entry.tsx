import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Notice } from "@sis/ui";
import { HomeAudience } from "./home-audience";
import { loadWorkspaceSession, activeWorkspaceHome } from "../lib/workspace-session";
import styles from "./home.module.css";

export default async function HomeEntry({ returnTo }: { returnTo?: string } = {}) {
  const session = await loadWorkspaceSession();
  if (session.state === "signed-in") redirect(await activeWorkspaceHome(session.me.activeWorkspace));
  if (session.state === "unavailable") return <main id="main-content" tabIndex={-1} className={styles.unavailable}>
    <h1>Your workspace is unavailable</h1>
    <Notice severity="warning" title="We could not confirm your workspace" message="Your session has not been changed. Reload to check your current role and scope before continuing." />
    <Link href="/">Check workspace again</Link>
  </main>;
  return <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="SIS home">
        <Image src="/brand/unza-crest.png" width={70} height={80} alt="" priority />
        <span><strong>THE UNIVERSITY OF ZAMBIA</strong><small>Student Information System</small></span>
      </Link>
      <nav className={styles.topLinks} aria-label="Public navigation">
        <Link href="/discover">Find a programme</Link>
        <Link href="/student/support">Student support</Link>
      </nav>
    </header>
    <main id="main-content" tabIndex={-1} className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>Student<br />Information System</h1>
        <p>Access your academic records, registration, examinations and more.</p>
      </div>
      <section className={styles.card} aria-labelledby="home-sign-in-title">
        <h2 id="home-sign-in-title">Welcome back</h2>
        <p className={styles.cardIntro}>Sign in to your SIS account to continue.</p>
        <HomeAudience returnTo={returnTo} />
      </section>
    </main>
    <footer className={styles.footer}>
      <small>© 2026 The University of Zambia. All rights reserved.</small>
      <nav aria-label="Footer navigation"><Link href="/recovery">Account help</Link><Link href="/discover">Programmes</Link><Link href="/student/support">Contact support</Link></nav>
    </footer>
  </div>;
}
