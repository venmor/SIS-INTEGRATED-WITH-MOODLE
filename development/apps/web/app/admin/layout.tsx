import Link from "next/link";
import { cookies } from "next/headers";
import { ContextBar } from "@sis/ui";
import styles from "./admin-shell.module.css";
import { WorkspaceNav } from "./workspace-nav";
import { institutionSetupAvailable } from "../../lib/institution-setup-permissions";
import { timetablePermissions } from "../../lib/timetable-permissions";
import { NavigationIcon } from "../navigation-icon";
import { StaffBreadcrumbs } from "./staff-breadcrumbs";
import { StaffAccountMenu } from "./staff-account-menu";
import { StaffScrollReset } from "./staff-scroll-reset";
import { workspaceHome } from "../../lib/workspace-home";

interface Me {
  account: {
    displayName: string;
  };
  activeWorkspace: {
    role: string;
    scopeType: string;
    scopeRef: string;
  } | null;
}

async function loadMe(): Promise<Me | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

  try {
    const response = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as Me;
  } catch {
    return null;
  }
}

function workspaceLabel(role: string | undefined, scopeRef?: string) {
  if (role === "ADMISSIONS_OFFICER") return "Admissions workspace";
  if (role === "EXAMINATIONS_OFFICER") return "Examinations workspace";
  if (role === "MODERATOR") return "Moderation workspace";
  if (role === "CASHIER") return "Cashier workspace";
  if (role === "ADMISSIONS_APPROVER") return "Admissions approval workspace";
  if (role === "RECORDS_OFFICER") return "Records workspace";
  if (role === "FINANCE_OFFICER") return "Finance workspace";
  if (role === "FINANCE_APPROVER") return "Finance approval workspace";
  if (role === "LEC") return "Lecturer workspace";
  if (role === "COORDINATOR") return "Coordinator workspace";
  if (role === "ADVISER") return "Academic adviser workspace";
  if (role === "MOODLE_ADMIN") return "Moodle administration";
  if (role === "INTEGRATION_SUPPORT") return "Integration support";
  if (role === "SYSADMIN") return "System administration";
  if (role === "DOMAIN_ADMIN")
    return scopeRef === "DEMO-UNIVERSITY"
      ? "University setup"
      : "Academic delivery setup";
  if (role === "TIMETABLE_COORDINATOR") return "Timetable planning";
  return "Staff workspace";
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await loadMe();
  const active = me?.activeWorkspace ?? null;
  const role = active?.role;
  const [timetable, setupAvailable] = await Promise.all([
    timetablePermissions(active),
    institutionSetupAvailable(active),
  ]);
  const home = workspaceHome(active, { timetable, setupAvailable,
    demoRulesAvailable: process.env.DEMO_MODE === "true" && process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS === "true" });
  const contextLabel = timetable?.canPublish
    ? "Timetable publication"
    : workspaceLabel(role, active?.scopeRef);
  const displayName = me?.account.displayName ?? "Account unavailable";
  const initials =
    me?.account.displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join("")
      .toLocaleUpperCase("en") || "SIS";

  const items: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/", label: "Workspace home", show: true },
    {
      href: "/admin/assessment/publications",
      label: "Results and amendments",
      show: role === "EXAMINATIONS_OFFICER",
    },
    {
      href: "/admin/admissions/queue",
      label: "Admissions queue",
      show: role === "ADMISSIONS_OFFICER" || role === "ADMISSIONS_APPROVER",
    },
    {
      href: "/admin/records/duplicates",
      label: "Identity review queue",
      show: role === "RECORDS_OFFICER",
    },
    {
      href: "/admin/finance",
      label: "Finance workspace",
      show: role === "FINANCE_OFFICER" || role === "FINANCE_APPROVER",
    },
    {
      href: "/admin/finance/cashier",
      label: "Cashier desk",
      show: role === "CASHIER",
    },
    {
      href: "/admin/teaching/groups",
      label: "Tutorial groups",
      show: role === "COORDINATOR",
    },
    {
      // Teaching staff deliver into the same Moodle courses students open, so
      // they need their own view of that delivery rather than the operations
      // workspace, which is scoped to delegated Moodle authority.
      href: "/admin/teaching/moodle",
      label: "Moodle classes",
      show:
        role === "LEC" ||
        role === "COORDINATOR" ||
        role === "HOD" ||
        role === "DEAN",
    },
    {
      href: "/admin/support",
      label: "Assigned support requests",
      show: role === "ADVISER",
    },
    {
      href: "/admin/assessment/plans",
      label: "Assessment plans",
      show: role === "LEC" || role === "COORDINATOR" || role === "MOODLE_ADMIN",
    },
    {
      href: "/admin/assessment/mappings",
      label: "Grade mappings",
      show: role === "LEC" || role === "COORDINATOR" || role === "MOODLE_ADMIN",
    },
    {
      href: "/admin/assessment/batches",
      label: "Grade batches",
      show: role === "LEC" || role === "COORDINATOR" || role === "MOODLE_ADMIN",
    },
    {
      href: "/admin/assessment/findings",
      label: "Validation queue",
      show:
        role === "LEC" ||
        role === "COORDINATOR" ||
        role === "MOODLE_ADMIN" ||
        role === "EXAMINATIONS_OFFICER",
    },
    {
      href: "/admin/assessment/moderation",
      label: "Moderation queue",
      show:
        role === "LEC" ||
        role === "COORDINATOR" ||
        role === "MODERATOR" ||
        role === "EXAMINATIONS_OFFICER",
    },
    {
      href: "/admin/assessment/packages",
      label: "Board packages",
      show:
        role === "LEC" ||
        role === "COORDINATOR" ||
        role === "MODERATOR" ||
        role === "EXAMINATIONS_OFFICER",
    },
    {
      href: "/admin/moodle/live-deliveries",
      label: "Live delivery recovery",
      show: role === "INTEGRATION_SUPPORT",
    },
    {
      href: "/admin/moodle/live-run",
      label: "Moodle connection setup",
      show: role === "MOODLE_ADMIN" || role === "INTEGRATION_SUPPORT",
    },
    {
      href: "/admin/moodle/live-bindings",
      label: "Live course connections",
      show: role === "MOODLE_ADMIN" || role === "COORDINATOR",
    },
    {
      href: "/admin/moodle",
      label: "Moodle administration",
      show: role === "MOODLE_ADMIN",
    },
    {
      href: "/admin/integration",
      label: "Integration support",
      show: role === "INTEGRATION_SUPPORT",
    },
    {
      href: "/admin/reviews",
      label: "Access reviews",
      show: role === "SYSADMIN",
    },
    {
      href: "/admin/setup/readiness",
      label: "Setup readiness",
      show: role === "SYSADMIN",
    },
    {
      href: "/admin/setup/university",
      label: "University structure",
      show: setupAvailable,
    },
    {
      href: "/admin/timetabling/demo-rules",
      label: "Timetable rule drafts",
      show:
        role === "DOMAIN_ADMIN" &&
        active?.scopeType === "CAMPUS" &&
        active?.scopeRef?.startsWith("DEMO-") === true,
    },
    {
      href: "/admin/timetabling/master",
      label: "Master timetable preview",
      show:
        role === "TIMETABLE_COORDINATOR" &&
        active?.scopeRef === "DEMO-UNIVERSITY",
    },
    {
      href: "/admin/timetabling/publications",
      label: "Timetable publication",
      show: timetable?.canRead === true,
    },
    {
      href: "/admin/grants",
      label: "Role assignments",
      show: role === "SYSADMIN",
    },
    {
      href: "/admin/audit",
      label: "Audit trail",
      show: role === "SYSADMIN",
    },
  ];
  const visibleItems = items.filter((item) => item.show);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Staff workspace navigation">
        <div className={styles.brand}>
          <Link href={home}>
            <span className={styles.brandMark} aria-hidden="true">
              SIS
            </span>
            <span>
              <strong>{contextLabel}</strong>
              <small>Student Information System</small>
            </span>
          </Link>
        </div>

        {active ? (
          <Link
            href="/workspaces"
            className={styles.contextSwitch}
            aria-label="Switch active workspace"
          >
            <NavigationIcon href="/admin/setup/readiness" />
            <ContextBar
              role={active.role}
              scopeType={active.scopeType}
              scopeRef={active.scopeRef}
            />
          </Link>
        ) : null}

        <div
          className={styles.desktopMenu}
          role="region"
          aria-label="Workspace navigation scroll area"
          tabIndex={0}
        >
          <WorkspaceNav items={visibleItems} />
        </div>
        <details className={styles.menu}>
          <summary className={styles.menuToggle}>Workspace sections</summary>
          <WorkspaceNav items={visibleItems} />
        </details>

        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <div className={styles.accountIdentity}>
            <p>{displayName}</p>
            <Link href="/sign-in">Switch account</Link>
          </div>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.topbarIdentity}>
            <span className={styles.topbarKicker}>Current workspace</span>
            <strong>{contextLabel}</strong>
          </div>
          <nav className={styles.topbarActions} aria-label="Account and help">
            <Link href="/workspaces">
              <NavigationIcon href="/" />
              Switch workspace
            </Link>
            <StaffAccountMenu displayName={displayName} />
          </nav>
        </header>
        <div id="main-content" tabIndex={-1} className={styles.main}>
          <StaffScrollReset />
          <StaffBreadcrumbs items={visibleItems} />
          {children}
        </div>
      </div>
    </div>
  );
}
