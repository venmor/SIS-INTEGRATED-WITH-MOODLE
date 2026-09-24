import { cookies } from "next/headers";
import { ContextBar } from "@sis/ui";
import { WorkspaceNav } from "../workspace-nav";
import styles from "./student.module.css";

interface Me {
  activeWorkspace: {
    role: string;
    scopeType: string;
    scopeRef: string;
  } | null;
}

async function loadMe(): Promise<Me | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;

  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/auth/me`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as Me;
  } catch {
    return null;
  }
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await loadMe();
  const active = me?.activeWorkspace ?? null;

  return (
    <div className={styles.portalShell}>
      <header className={styles.portalChrome}>
        <div className={styles.portalChromeInner}>
          <div className={styles.portalIdentity}>
            <strong>Student portal</strong>
            <span>Student Information System</span>
          </div>
          {active ? (
            <ContextBar
              role={active.role}
              scopeType={active.scopeType}
              scopeRef={active.scopeRef}
            />
          ) : null}
          <WorkspaceNav role={active?.role} />
        </div>
      </header>
      <main className={styles.portalContent} id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
