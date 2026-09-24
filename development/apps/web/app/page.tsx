import { cookies } from "next/headers";
import Link from "next/link";
import { SECURITY_V1 } from "@sis/config";
import { ContextBar, Notice, Status } from "@sis/ui";
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
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions and student services</p>
          <h1 className={styles.title}>Student Information System</h1>
          <p className={styles.lede}>
            Explore programmes and entry requirements, then sign in to start or
            continue your application.
          </p>
          <Status
            severity="info"
            state="Start with programme discovery"
            reason="Read requirements, compare programmes and check the intake deadline before applying."
            updated="Programme details show their latest published version."
            action="Choose a programme or sign in to continue."
          />
          <div className={styles.actions}>
            <Link className={styles.primary} href="/discover">
              Find a programme
            </Link>
          </div>
          <p className={styles.supporting}>
            <Link href="/applicant">Sign in to the applicant portal</Link>
          </p>
        </main>
      </div>
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
          {active?.role === "APPLICANT" ? (
            <Link className={styles.primary} href="/applicant">
              Applicant portal
            </Link>
          ) : null}
          {active?.role === "STUDENT" ? (
            <Link className={styles.primary} href="/student">
              Student portal
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
          {active && SECURITY_V1.grantorRoles.includes(active.role) ? (
            <a className={styles.primary} href="/admin/grants">
              Role assignments
            </a>
          ) : null}
          {active ? (
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
