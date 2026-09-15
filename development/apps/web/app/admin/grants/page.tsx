import { cookies } from "next/headers";
import { SECURITY_V1 } from "@sis/config";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";
import { GrantForm } from "./form";

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
    const body = (await res.json()) as { activeWorkspace: { role: string } | null };
    return body.activeWorkspace?.role ?? null;
  } catch {
    return null;
  }
}

export default async function GrantsPage() {
  const role = await activeRole();
  const allowed = role !== null && SECURITY_V1.grantorRoles.includes(role);
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Role assignments</h1>
        {allowed ? (
          <>
            <p className={styles.lede}>
              Create a scoped, time-bound assignment. Missing appointment evidence never yields a privileged workspace.
            </p>
            <GrantForm />
          </>
        ) : (
          <Notice
            severity="warning"
            title="Restricted area"
            message="Role assignment needs an administrator workspace. Switch to one, or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        )}
      </main>
    </div>
  );
}
