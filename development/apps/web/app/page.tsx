import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@sis/ui";
import { PublicHeader } from "./public-header";
import { loadWorkspaceSession, activeWorkspaceHome } from "../lib/workspace-session";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await loadWorkspaceSession();
  if (session.state === "signed-in") redirect(await activeWorkspaceHome(session.me.activeWorkspace));
  if (session.state === "unavailable") return (
    <div className={styles.page}>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <h1 className={styles.title}>Your workspace is unavailable</h1>
        <Notice severity="warning" title="We could not confirm your workspace" message="Your session has not been changed. Reload to check your current role and scope before continuing." />
        <Link href="/">Check workspace again</Link>
      </main>
    </div>
  );
    return (
      <>
        <PublicHeader current="home" />
        <div className={styles.page}>
          <main id="main-content" tabIndex={-1} className={styles.main}>
            <p className={styles.context}>One place for university work</p>
            <h1 className={styles.title}>Continue your work in the SIS</h1>
            <p className={styles.lede}>
              Students, applicants and staff sign in to their own workspaces.
              You can also explore programmes without signing in.
            </p>
            <div className={styles.entryGrid}>
              <section
                className={styles.entryPrimary}
                aria-labelledby="entry-sign-in"
              >
                <p className={styles.entryEyebrow}>For existing accounts</p>
                <h2 id="entry-sign-in">Sign in to your workspace</h2>
                <p>
                  Continue registration, applications, teaching or university
                  administration using your SIS account.
                </p>
                <Link className={styles.primary} href="/sign-in">
                  Sign in
                </Link>
              </section>
              <section
                className={styles.entrySecondary}
                aria-labelledby="entry-discovery"
              >
                <p className={styles.entryEyebrow}>
                  For prospective applicants
                </p>
                <h2 id="entry-discovery">Explore programmes</h2>
                <p>
                  Search published programmes, check requirements and compare
                  available study options before applying.
                </p>
                <Link href="/discover">Find a programme →</Link>
              </section>
            </div>
          </main>
        </div>
      </>
    );
}
