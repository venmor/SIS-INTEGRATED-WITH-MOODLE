import { cookies } from "next/headers";
import Link from "next/link";
import { SECURITY_V1 } from "@sis/config";
import { ContextBar, Notice, Status } from "@sis/ui";
import { PublicHeader } from "./public-header";
import { formatLusaka } from "../lib/time";
import styles from "./page.module.css";
import { ExpiryBanner } from "./expiry-banner";
import { WorkspaceSwitcher } from "./workspace-switcher";

export const dynamic = "force-dynamic";

interface Workspace {
  assignmentId: string;
  role: string;
  scopeType: string;
  scopeRef: string;
  startsAt: string;
  endsAt: string | null;
  employmentType: string | null;
}

interface Me {
  account: {
    accountId: string;
    personId: string;
    username: string;
    displayName: string;
  };
  workspaces: Workspace[];
  activeWorkspace: {
    assignmentId: string;
    role: string;
    scopeType: string;
    scopeRef: string;
    endsAt: string | null;
  } | null;
}

async function loadMe(): Promise<Me | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

export default async function Home() {
  const me = await loadMe();
  if (!me) {
    return (
      <>
        <PublicHeader current="home" />
        <div className={styles.page}>
          <main id="main-content" className={styles.main}>
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
  const active = me.activeWorkspace;
  const breakGlass = active?.scopeType === "BREAK_GLASS" ? active : null;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Student Information System</h1>
        {breakGlass ? (
          <div
            role="alert"
            aria-live="assertive"
            aria-label="Emergency access active"
          >
            <Notice
              severity="warning"
              title="Emergency access active"
              message={`Incident ${breakGlass.scopeRef} expires ${breakGlass.endsAt ? formatLusaka(breakGlass.endsAt) : "soon"}. All actions are subject to enhanced audit.`}
            />
          </div>
        ) : null}
        <ExpiryBanner />
        {active ? (
          <ContextBar
            role={active.role}
            scopeType={active.scopeType}
            scopeRef={active.scopeRef}
          />
        ) : (
          <Notice
            severity="info"
            title="No active workspace"
            message="Your session is signed in, but none of your role assignments is currently usable. Ask an administrator to review your assignments."
          />
        )}
        <Status
          severity="success"
          state={`Signed in as ${me.account.displayName}`}
          reason="Your session is active on this device."
          updated={formatLusaka(new Date())}
          action="Select an active workspace below to proceed."
        />
        <WorkspaceSwitcher
          workspaces={me.workspaces}
          activeId={active?.assignmentId ?? null}
        />
        <div className={styles.actions}>
          {active?.role === "APP" || active?.role === "APPLICANT" ? (
            <Link className={styles.primary} href="/applicant">
              Applicant portal
            </Link>
          ) : null}
          {active?.role === "STU" || active?.role === "STUDENT" ? (
            <Link className={styles.primary} href="/student">
              Student portal
            </Link>
          ) : null}
          {active?.role === "ADVISER" ? (
            <Link className={styles.primary} href="/admin/support">
              Academic support requests
            </Link>
          ) : null}
          {active?.role === "DOMAIN_ADMIN" && active.scopeRef.startsWith("DEMO-") ? (
            <Link className={styles.primary} href="/admin/timetabling/demo-rules">
              Timetable rule drafts
            </Link>
          ) : null}
          {active?.role === "ADMISSIONS_OFFICER" ? (
            <Link className={styles.primary} href="/admin/admissions/queue">
              Admissions queue
            </Link>
          ) : null}
          {active?.role === "RECORDS_OFFICER" ? (
            <Link className={styles.primary} href="/admin/records/duplicates">
              Identity review queue
            </Link>
          ) : null}
          {active?.role === "MOODLE_ADMIN" ? (
            <Link className={styles.primary} href="/admin/moodle">
              Moodle administration
            </Link>
          ) : null}
          {active?.role === "INTEGRATION_SUPPORT" ? (
            <Link className={styles.primary} href="/admin/integration">
              Integration support
            </Link>
          ) : null}
          {active?.role === "COORDINATOR" ? (
            <Link className={styles.primary} href="/admin/teaching/groups">
              Tutorial groups
            </Link>
          ) : null}
          {active?.role === "LEC" ||
          active?.role === "COORDINATOR" ||
          active?.role === "MOODLE_ADMIN" ? (
            <Link className={styles.primary} href="/admin/assessment/plans">
              Assessment plans
            </Link>
          ) : null}
          {active?.role === "LEC" ||
          active?.role === "COORDINATOR" ||
          active?.role === "MOODLE_ADMIN" ? (
            <Link className={styles.primary} href="/admin/assessment/mappings">
              Grade mappings
            </Link>
          ) : null}
          {active?.role === "FINANCE_OFFICER" ||
          active?.role === "FINANCE_APPROVER" ? (
            <Link className={styles.primary} href="/admin/finance">
              Finance workspace
            </Link>
          ) : null}
          {active && SECURITY_V1.grantorRoles.includes(active.role) ? (
            <a className={styles.primary} href="/admin/grants">
              Role assignments
            </a>
          ) : null}
          {active?.role === "SYSADMIN" ? (
            <Link className={styles.primary} href="/admin/reviews">
              Access reviews
            </Link>
          ) : null}
          {active && SECURITY_V1.grantorRoles.includes(active.role) ? (
            <Link className={styles.primary} href="/admin/audit">
              Audit trail
            </Link>
          ) : null}
          <a className={styles.primary} href="/sign-in">
            Switch account
          </a>
        </div>
      </main>
    </div>
  );
}
