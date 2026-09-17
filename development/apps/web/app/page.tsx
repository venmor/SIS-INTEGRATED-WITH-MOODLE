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
          <p className={styles.context}>Implementation shell · Phase 0</p>
          <h1 className={styles.title}>Student Information System</h1>
          <p className={styles.lede}>
            UNZA student lifecycle coordination, integrated with Moodle. This
            shell proves the interface baseline renders — no business feature
            lives here yet.
          </p>
          <Status
            severity="info"
            state="Shell running — no business data"
            reason="Interface, API liveness and design tokens are in place. Applicant, registration and result workflows arrive in later slices."
            updated="Phase 0, slice 4"
            action="Next: sign in, then continue to the roles slice."
          />
          <div className={styles.actions}>
            <a className={styles.primary} href="/sign-in">
              Sign in
            </a>
          </div>
          <p className={styles.supporting}>
            Expected API shape:{" "}
            <code className={styles.code}>
              {"{ status: 'ok', version: '0.1.0' }"}
            </code>
            . Colours are a proposed palette and require institutional approval.
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
          action="Choose a workspace below. Powers never appear silently — only the active role applies."
        />
        <WorkspaceSwitcher
          workspaces={me.workspaces}
          activeId={active?.assignmentId ?? null}
        />
        <div className={styles.actions}>
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
