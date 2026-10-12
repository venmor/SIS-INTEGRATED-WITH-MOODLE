import styles from "../page.module.css";
import signInStyles from "./sign-in.module.css";
import { SignInForm } from "./form";
import { PublicHeader } from "../public-header";
import Link from "next/link";
import { NavigationIcon } from "../navigation-icon";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  // Only the explicitly configured fictional environment advertises seed access.
  const demoAccount =
    process.env.DEMO_MODE === "true"
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
            blurb: "Manages Moodle mappings, shells and synchronization.",
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
            blurb: "Decides adjustments, refunds and payment arrangements.",
          },
          ...(process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS === "true"
            ? [
                {
                  role: "Campus timetable rules",
                  username: "nasilele.scheduler",
                  password: "Seed-2026-Scheduler",
                  blurb:
                    "Edits fictional campus rules. Use the coordinator account for timetable previews.",
                  workspaceHref: "/admin/timetabling/demo-rules",
                },
                {
                  role: "Timetable coordinator",
                  username: "nasilele.master",
                  password: "Seed-2026-Master",
                  blurb:
                    "Opens the full master timetable and course previews. This is a separate demo account.",
                  workspaceHref: "/admin/timetabling/master",
                },
                {
                  role: "Timetable publication reviewer",
                  username: "tembo.timetable",
                  password: "Seed-2026-Timetable",
                  blurb:
                    "Independently reviews and publishes the fictional timetable.",
                  workspaceHref: "/admin/timetabling/publications",
                },
                {
                  role: "Timetable sample student",
                  username: "chanda.time",
                  password: "Seed-2026-Student",
                  blurb:
                    "Views classes for the registered fictional publication period.",
                  workspaceHref:
                    "/student/timetable?period=DEMO-2026-PUBLICATION",
                },
              ]
            : []),
          ...(process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP === "true"
            ? [
                {
                  role: "University setup proposer",
                  username: "nalumino.setup",
                  password: "Seed-2026-Setup",
                  blurb:
                    "Edits the fictional university structure and calendar, then saves a version for independent review.",
                  workspaceHref: "/admin/setup/university",
                },
                {
                  role: "University setup reviewer",
                  username: "chileshe.policy",
                  password: "Seed-2026-Policy",
                  blurb:
                    "Reviews the exact saved version and activates it separately from its proposer.",
                  workspaceHref: "/admin/setup/university",
                },
              ]
            : []),
        ]
      : undefined;
  return (
    <>
      <PublicHeader current="sign-in" />
      <div className={styles.page}>
        <main
          id="main-content" tabIndex={-1}
          className={`${styles.main} ${signInStyles.main}`}
        >
          <p className={styles.context}>Your account</p>
          <h1 className={styles.title}>Sign in to the SIS</h1>
          <p className={styles.lede}>
            Enter your SIS username and password to continue to your workspace.
          </p>
          <div className={signInStyles.workspace}>
            <section aria-label="Account sign-in">
              <SignInForm
                returnTo={returnTo}
                demoAccount={demoAccount}
                demoStaff={demoStaff}
              />
            </section>
            <aside
              className={signInStyles.helpPanel}
              aria-labelledby="signin-options-title"
            >
              <h2 id="signin-options-title">Find your starting point</h2>
              <ul className={signInStyles.options}>
                <li>
                  <NavigationIcon href="/student/courses" />
                  <div>
                    <h3>Students and staff</h3>
                    <p>Sign in to continue your studies or assigned work.</p>
                  </div>
                </li>
                <li>
                  <NavigationIcon href="/discover" />
                  <div>
                    <h3>New applicants</h3>
                    <p>Compare programmes and entry requirements first.</p>
                    <Link href="/discover">Explore programmes</Link>
                  </div>
                </li>
                <li>
                  <NavigationIcon href="/student/support" />
                  <div>
                    <h3>Account support</h3>
                    <p>Use account recovery if you cannot sign in.</p>
                    <Link href="/recovery">Get sign-in help</Link>
                  </div>
                </li>
              </ul>
              <p className={signInStyles.securityNote}>
                On a shared device, sign out when you finish.
              </p>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
