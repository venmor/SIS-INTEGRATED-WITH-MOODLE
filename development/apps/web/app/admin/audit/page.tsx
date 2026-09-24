import { cookies } from "next/headers";
import { SECURITY_V1 } from "@sis/config";
import type { AuditTimelineResponse } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";
import { AuditTimeline } from "./timeline";

export const dynamic = "force-dynamic";

type AuditGate =
  | { kind: "allowed"; initial: AuditTimelineResponse }
  | { kind: "denied" }
  | { kind: "unavailable" };

async function loadGate(): Promise<AuditGate> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { kind: "denied" };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const me = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (me.status === 401 || me.status === 403) return { kind: "denied" };
    if (!me.ok) return { kind: "unavailable" };
    const body = (await me.json()) as {
      activeWorkspace: { role: string } | null;
    };
    const role = body.activeWorkspace?.role ?? null;
    if (role === null || !SECURITY_V1.grantorRoles.includes(role)) {
      return { kind: "denied" };
    }

    const timeline = await fetch(`${api}/auth/audit/timeline?take=20`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (timeline.status === 401 || timeline.status === 403) {
      return { kind: "denied" };
    }
    if (!timeline.ok) return { kind: "unavailable" };
    return {
      kind: "allowed",
      initial: (await timeline.json()) as AuditTimelineResponse,
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export default async function AuditPage() {
  const gate = await loadGate();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Audit trail</h1>
        {gate.kind !== "allowed" ? (
          <Notice
            severity="warning"
            title={
              gate.kind === "denied"
                ? "Audit authority unavailable"
                : "Audit evidence temporarily unavailable"
            }
            message={
              gate.kind === "denied"
                ? "The audit trail needs an administrator workspace."
                : "The identity service could not load audit evidence. Do not infer an empty audit trail; restore connectivity, then retry."
            }
            action={
              gate.kind === "denied"
                ? { label: "Back home", href: "/" }
                : { label: "Retry audit trail", href: "/admin/audit" }
            }
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
