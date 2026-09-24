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
  // Staff demo accounts follow the same rule: fictional seed credentials for
  // the admissions demo path (officer claims/recommends, approver releases).
  // Elevated (SYSADMIN) and unrelated-role seeds stay unadvertised.
  const demoStaff =
    process.env.DEMO_MODE === "true"
      ? [
          {
            role: "Admissions officer",
            username: "temwani.r",
            password: "Seed-2026-Temwani",
            blurb:
              "Claims cases from the queue, records findings and recommendations.",
          },
          {
            role: "Admissions approver",
            username: "kasonde.a",
            password: "Seed-2026-Kasonde",
            blurb: "Releases decisions separately from the recommendation.",
          },
          {
            role: "Finance officer",
            username: "kabwe.f",
            password: "Seed-2026-Kabwe",
            blurb:
              "Assesses charges, reconciles cases, records sponsorships and cash.",
          },
          {
            role: "Moodle administrator",
            username: "mumba.s",
            password: "Seed-2026-Mumba",
            blurb:
              "Manages Moodle mappings, shells and synchronization.",
          },
          {
            role: "Integration support",
            username: "kunda.b",
            password: "Seed-2026-Kunda",
            blurb:
              "Retries deliveries, replays dead letters, reconciles drift.",
          },
          {
            role: "Programme coordinator",
            username: "mwila.t",
            password: "Seed-2026-Mwila",
            blurb:
              "Manages tutorial groups, allocations and teaching assignments.",
          },
          {
            role: "Finance approver",
            username: "mulenga.g",
            password: "Seed-2026-Mulenga",
            blurb:
              "Decides adjustments, refunds and payment arrangements.",
          },
        ]
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
        <SignInForm
          returnTo={returnTo}
          demoAccount={demoAccount}
          demoStaff={demoStaff}
        />
      </main>
    </div>
  );
}
