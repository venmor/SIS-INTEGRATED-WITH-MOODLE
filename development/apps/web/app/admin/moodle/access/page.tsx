import staffUi from "../../staff-workspace.module.css";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ConnectionView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { WriteReadinessNotice } from "../write-readiness";
import { moodleBackendLabel } from "../../../../lib/moodle-status";
import { Provisioner } from "./provisioner";
import styles from "../../staff-workspace.module.css";

export const dynamic = "force-dynamic";

async function loadAuthority<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// SCR-OPS-MOODLE-002 Delegated Moodle access workspace: search, single or
// cohort assignment, validity policy and withdrawal. The API decides
// authority from live role capabilities and scope, never from this page.
export default async function MoodleAccessPage() {
  const [health, requests] = await Promise.all([
    loadAuthority<ConnectionView>("/integration/health"),
    loadAuthority<Parameters<typeof Provisioner>[0]["initialRequests"]>(
      "/moodle/provision?limit=10",
    ),
  ]);

  if (!health.ok || !requests.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moodle access</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="Assigning Moodle access needs delegated authority for this school or programme. Ask an administrator to grant the Moodle provisioning capability, or sign in with a role that carries it."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Moodle access</h1>
        <p>
          <Link href="/">Workspace home</Link>
        </p>
        <Notice
          severity={health.data.backend === "simulator" ? "info" : health.data.status === "HEALTHY" ? "success" : "warning"}
          title={health.data.backend === "simulator" ? "Simulator active — not connected to MoodleCloud" : `Connection ${health.data.status}`}
          message={`Provider ${health.data.provider} · ${moodleBackendLabel(health.data.backend)}. Access requests are recorded in the SIS first; ${health.data.backend === "simulator" ? "simulator records do not confirm MoodleCloud delivery." : "Moodle delivery happens in the background."}`}
        />
        <WriteReadinessNotice readiness={health.data.writeReadiness} />
        <Provisioner initialRequests={requests.data} backend={health.data.backend} />
      </main>
    </div>
  );
}
