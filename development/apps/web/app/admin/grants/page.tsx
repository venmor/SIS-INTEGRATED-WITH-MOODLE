import { cookies } from "next/headers";
import { SECURITY_V1 } from "@sis/config";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";
import { GrantForm } from "./form";

export const dynamic = "force-dynamic";

async function grantAccess(): Promise<"allowed" | "denied" | "unavailable"> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return "denied";
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) return "denied";
    if (!res.ok) return "unavailable";
    const body = (await res.json()) as {
      activeWorkspace: { role: string } | null;
    };
    const role = body.activeWorkspace?.role ?? null;
    return role !== null && SECURITY_V1.grantorRoles.includes(role)
      ? "allowed"
      : "denied";
  } catch {
    return "unavailable";
  }
}

export default async function GrantsPage() {
  const access = await grantAccess();
  const allowed = access === "allowed";
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
            title={
              access === "denied"
                ? "Role assignment authority unavailable"
                : "Role assignment service temporarily unavailable"
            }
            message={
              access === "denied"
                ? "Role assignment needs an administrator workspace."
                : "The identity service could not confirm your grant authority. No assignment has been changed; restore connectivity, then retry."
            }
            action={
              access === "denied"
                ? { label: "Back home", href: "/" }
                : { label: "Retry role assignments", href: "/admin/grants" }
            }
          />
        )}
      </main>
    </div>
  );
}
