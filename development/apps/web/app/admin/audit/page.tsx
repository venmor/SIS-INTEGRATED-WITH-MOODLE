import { cookies } from "next/headers";
import { SECURITY_V1 } from "@sis/config";
import type { AuditTimelineResponse } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";
import { AuditTimeline } from "./timeline";

export const dynamic = "force-dynamic";

async function loadGate(): Promise<{
  allowed: boolean;
  initial: AuditTimelineResponse | null;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { allowed: false, initial: null };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const me = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!me.ok) return { allowed: false, initial: null };
    const body = (await me.json()) as {
      activeWorkspace: { role: string } | null;
    };
    const role = body.activeWorkspace?.role ?? null;
    if (role === null || !SECURITY_V1.grantorRoles.includes(role)) {
      return { allowed: false, initial: null };
    }
    const timeline = await fetch(`${api}/auth/audit/timeline?take=20`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!timeline.ok) return { allowed: false, initial: null };
    return {
      allowed: true,
      initial: (await timeline.json()) as AuditTimelineResponse,
    };
  } catch {
    return { allowed: false, initial: null };
  }
}

export default async function AuditPage() {
  const gate = await loadGate();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Audit trail</h1>
        {!gate.allowed || !gate.initial ? (
          <Notice
            severity="warning"
            title="Restricted area"
            message="The audit trail needs an administrator workspace. Switch to one, or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        ) : (
          <>
            <p className={styles.lede}>
              Immutable security record. Entries show local institutional time
              with actor, role and outcome.
            </p>
            <AuditTimeline initial={gate.initial} />
          </>
        )}
      </main>
    </div>
  );
}
