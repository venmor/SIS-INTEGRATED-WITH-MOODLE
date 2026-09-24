import Link from "next/link";
import { cookies } from "next/headers";
import { ContextBar } from "@sis/ui";
import styles from "./admin-shell.module.css";
import { WorkspaceNav } from "../workspace-nav";

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

function workspaceLabel(role: string | undefined) {
  if (role === "ADMISSIONS_OFFICER") return "Admissions workspace";
  if (role === "ADMISSIONS_APPROVER") return "Admissions approval workspace";
  if (role === "RECORDS_OFFICER") return "Records workspace";
  if (role === "FINANCE_OFFICER") return "Finance workspace";
  if (role === "FINANCE_APPROVER") return "Finance approval workspace";
  if (role === "COORDINATOR") return "Teaching workspace";
  if (role === "MOODLE_ADMIN") return "Moodle administration";
  if (role === "INTEGRATION_SUPPORT") return "Integration support";
  if (role === "SYSADMIN") return "System administration";
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

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Staff workspace navigation">
        <div className={styles.brand}>
          <Link href="/">
            <span className={styles.brandMark} aria-hidden="true">
              SIS
            </span>
            <span>
              <strong>{workspaceLabel(role)}</strong>
              <small>Student Information System</small>
            </span>
          </Link>
        </div>

        {active ? (
          <ContextBar
            role={active.role}
            scopeType={active.scopeType}
            scopeRef={active.scopeRef}
          />
        ) : null}

        <details className={styles.menu}>
          <summary className={styles.menuToggle}>
            Workspace sections
          </summary>
          <div className={styles.navWrap}>
            <WorkspaceNav role={role} variant="sidebar" />
          </div>
        </details>

        <div className={styles.account}>
          <p>{me?.account.displayName ?? "Signed-in user"}</p>
          <Link href="/sign-in">Switch account</Link>
        </div>
      </aside>

      <div className={styles.content} id="main-content" tabIndex={-1}>{children}</div>
    </div>
  );
}
