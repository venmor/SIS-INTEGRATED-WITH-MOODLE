import Link from "next/link";
import { cookies } from "next/headers";
import { ContextBar } from "@sis/ui";
import styles from "./admin-shell.module.css";

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

  const items: Array<{ href: string; label: string; show: boolean }> = [
    {
      href: "/admin/admissions/queue",
      label: "Admissions queue",
      show: role === "ADMISSIONS_OFFICER",
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
      href: "/admin/teaching/groups",
      label: "Tutorial groups",
      show: role === "COORDINATOR",
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

        <nav className={styles.nav} aria-label="Workspace sections">
          <Link href="/">Workspace home</Link>
          {items
            .filter((item) => item.show)
            .map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
        </nav>

        <div className={styles.account}>
          <p>{me?.account.displayName ?? "Signed-in user"}</p>
          <Link href="/sign-in">Switch account</Link>
        </div>
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
