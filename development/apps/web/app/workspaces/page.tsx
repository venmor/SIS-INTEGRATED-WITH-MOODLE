import Link from "next/link";
import { redirect } from "next/navigation";
import { SECURITY_V1 } from "@sis/config";
import { ContextBar, Notice, Status } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import styles from "../page.module.css";
import { ExpiryBanner } from "../expiry-banner";
import { WorkspaceSwitcher } from "../workspace-switcher";
import { institutionSetupAvailable } from "../../lib/institution-setup-permissions";
import { timetablePermissions } from "../../lib/timetable-permissions";
import { loadWorkspaceSession } from "../../lib/workspace-session";
import { workspaceHome } from "../../lib/workspace-home";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const session = await loadWorkspaceSession();
  if (session.state === "anonymous") redirect("/sign-in?returnTo=%2Fworkspaces");
  if (session.state === "unavailable") return (
    <div className={styles.page}>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <h1 className={styles.title}>Workspaces unavailable</h1>
        <Notice severity="warning" title="We could not confirm your role assignments" message="Your active workspace has not been changed. Reload before choosing another workspace." />
        <Link href="/workspaces">Check workspaces again</Link>
      </main>
    </div>
  );
  const me = session.me;
  const active = me.activeWorkspace;
  const [timetable, setupAvailable] = await Promise.all([timetablePermissions(active), institutionSetupAvailable(active)]);
  const home = workspaceHome(active, { timetable, setupAvailable,
    demoRulesAvailable: process.env.DEMO_MODE === "true" && process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS === "true" });
  const breakGlass = active?.scopeType === "BREAK_GLASS" ? active : null;
  return (
    <div className={styles.page}>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Switch workspace</h1>
        <p className={styles.lede}>Choose the role and scope for your next task. Your other assignments remain separate.</p>
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
        {home !== "/workspaces" ? <Link className={styles.primary} href={home}>Continue current workspace</Link> : null}
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
          {setupAvailable ? (
            <Link className={styles.primary} href="/admin/setup/university">
              University structure and calendar
            </Link>
          ) : null}
          {active?.role === "DOMAIN_ADMIN" && active.scopeType === "CAMPUS" && active.scopeRef.startsWith("DEMO-") ? (
            <Link className={styles.primary} href="/admin/timetabling/demo-rules">
              Timetable rule drafts
            </Link>
          ) : null}
          {active?.role === "TIMETABLE_COORDINATOR" && active.scopeRef === "DEMO-UNIVERSITY" ? (
            <Link className={styles.primary} href="/admin/timetabling/master">
              Master timetable preview
            </Link>
          ) : null}
          {timetable?.canRead ? <Link className={styles.primary} href="/admin/timetabling/publications">Timetable publication</Link> : null}
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
          active?.role === "HOD" ||
          active?.role === "DEAN" ? (
            <Link className={styles.primary} href="/admin/teaching/moodle">
              Moodle classes
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
