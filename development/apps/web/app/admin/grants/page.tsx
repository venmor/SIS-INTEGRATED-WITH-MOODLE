import { cookies } from "next/headers";
import { SECURITY_V1 } from "@sis/config";
import { Notice } from "@sis/ui";
import styles from "../staff-workspace.module.css";
import {
  GrantForm,
  type DelegableCapability,
  type DelegationApprover,
} from "./form";

export const dynamic = "force-dynamic";

async function activeRole(): Promise<string | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      activeWorkspace: { role: string } | null;
    };
    return body.activeWorkspace?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * What this actor may delegate comes from the configured approver registry
 * (capability + target scope per approver role), never from a hardcoded role
 * list. A HOD with `moodle:provision` authority at their school therefore
 * sees the delegation form even though the IAM grantor role list is narrower.
 */
async function loadDelegable(): Promise<{
  items: DelegableCapability[];
  approver: DelegationApprover | null;
} | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/grants/delegable`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      items: DelegableCapability[];
      approver: DelegationApprover | null;
    };
  } catch {
    return null;
  }
}

export default async function GrantsPage() {
  const [role, delegable] = await Promise.all([activeRole(), loadDelegable()]);
  const canGrantGenerally =
    role !== null && SECURITY_V1.grantorRoles.includes(role);
  const delegableItems = delegable?.items ?? [];
  const allowed = canGrantGenerally || delegableItems.length > 0;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Role assignments</h1>
        {allowed ? (
          <>
            <p className={styles.lede}>
              Create a scoped, time-bound assignment. Delegated capabilities
              come from the configured approver registry: choose one and the
              scope and capability are fixed for you. Missing appointment
              evidence never yields a privileged workspace.
            </p>
            <section
              className={styles.panel}
              aria-label="Scoped role assignment"
            >
              {delegableItems.length > 0 ? (
                <p className={styles.supporting}>
                  You may delegate {delegableItems.length} capability
                  {delegableItems.length === 1 ? "" : "s"} inside your current
                  scope, including Moodle access assignment where policy allows.
                </p>
              ) : null}
              <GrantForm
                delegable={delegableItems}
                approver={delegable?.approver ?? null}
                allowGeneric={canGrantGenerally}
              />
            </section>
          </>
        ) : (
          <Notice
            severity="warning"
            title="Restricted area"
            message="Role assignment needs an administrator workspace or delegated authority for a capability. Switch to one, or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        )}
      </main>
    </div>
  );
}
