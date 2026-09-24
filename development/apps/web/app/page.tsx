import { cookies } from "next/headers";
import Link from "next/link";
import { ContextBar, Notice, Status } from "@sis/ui";
import { formatLusaka } from "../lib/time";
import styles from "./page.module.css";
import { ExpiryBanner } from "./expiry-banner";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { getWorkspaceNavItems, WorkspaceNav } from "./workspace-nav";

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

type HomeIdentityState =
  | { kind: "signed-out" }
  | { kind: "unavailable" }
  | { kind: "signed-in"; me: Me };

async function loadMe(): Promise<HomeIdentityState> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { kind: "signed-out" };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401) return { kind: "signed-out" };
    if (!res.ok) return { kind: "unavailable" };
    return { kind: "signed-in", me: (await res.json()) as Me };
  } catch {
    return { kind: "unavailable" };
  }
}

export default async function Home() {
  const identity = await loadMe();
  if (identity.kind === "signed-out") {
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
  if (identity.kind === "unavailable") {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Workspace temporarily unavailable</h1>
          <Notice
            severity="warning"
            title="We cannot confirm your signed-in workspace"
            message="The identity service is temporarily unavailable. Your session and institutional records have not been changed. Retry when connectivity is restored."
            action={{ label: "Retry workspace", href: "/" }}
          />
        </main>
      </div>
    );
  }

  const me = identity.me;
  const active = me.activeWorkspace;
  const liveDestinations = active ? getWorkspaceNavItems(active.role) : [];
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
          action={
            active && liveDestinations.length === 0
              ? "This role has no dedicated live screen in the current release. Switch workspace if another assignment is available."
              : "Select an active workspace below to proceed."
          }
        />
        <WorkspaceSwitcher
          workspaces={me.workspaces}
          activeId={active?.assignmentId ?? null}
        />
        {active && liveDestinations.length > 0 ? (
          <WorkspaceNav role={active.role} />
        ) : active ? (
          <Notice
            severity="info"
            title="No dedicated live workspace for this role"
            message="This role is recognized by identity and access control, but the current release does not expose an authoritative operational screen for it. If you hold another assignment, switch workspace above."
          />
        ) : null}
        <div className={styles.actions}>
          <a className={styles.primary} href="/sign-in">
            Switch account
          </a>
        </div>
      </main>
    </div>
  );
}
