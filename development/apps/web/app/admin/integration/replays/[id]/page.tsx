import { cookies } from "next/headers";
import Link from "next/link";
import { Notice } from "@sis/ui";
import { ReplayDecideForm } from "./decide";
import styles from "../../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/integration${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

interface ReplayItem {
  id: string;
  scope: string;
  status: string;
  evidence: unknown;
  createdAt: string;
}

// UI-DECISION-001 replay decision: frozen evidence package, reason and
// declaration. The signatory sees exactly the version they sign.
export default async function ReplayDecidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await loadStaff<{ items: ReplayItem[] }>("/replays");
  const item = list.ok
    ? list.data.items.find((r) => r.id === id)
    : undefined;
  if (!item)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Replay decision</h1>
          <Notice
            severity="warning"
            title="Replay unavailable"
            message="This replay needs integration authority, or it does not exist in your scope."
            action={{ label: "Integration support", href: "/admin/integration" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Replay decision · {item.status}
        </h1>
        <p>
          <Link href="/admin/integration">Integration support</Link>
        </p>
        <Notice
          severity="info"
          title="Frozen evidence package"
          message="This replay preserves correlation and idempotency. It will not create a second enrolment or record change if the destination already processed it. The evidence below is the exact version you sign."
        />
        <h2>Evidence</h2>
        <pre>{JSON.stringify(item.evidence, null, 2)}</pre>
        {item.status === "PENDING" ? (
          <>
            <h2>Sign the decision</h2>
            <p>
              I confirm that I have reviewed the stated evidence and make
              this decision within my assigned authority.
            </p>
            <ReplayDecideForm replayId={item.id} />
          </>
        ) : null}
      </main>
    </div>
  );
}
