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

// UI-DECISION-001 replay decision: frozen evidence, consequence and
// declaration. The signatory sees exactly the version they sign.
export default async function ReplayDecidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await loadStaff<{ items: ReplayItem[] }>("/replays");
  const item = list.ok ? list.data.items.find((r) => r.id === id) : undefined;
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
        <h1 className={styles.title}>Replay decision · {item.status}</h1>
        <p>
          <Link href="/admin/integration">Integration support</Link>
        </p>

        <section className={styles.section} aria-label="Replay consequence">
          <h2>Replay consequence</h2>
          <p>
            An approved replay is idempotent: it retries delivery with the
            preserved correlation evidence and must not create a second
            destination record.
          </p>
          <p>
            Four-eyes control applies. A second officer must decide the replay;
            the requester cannot approve their own request. Approval resets
            delivery work only and does not edit the SIS source record.
          </p>
        </section>

        <Notice
          severity="info"
          title="Frozen evidence package"
          message="The evidence below is the exact version attached to this decision. Review it before signing."
        />

        <section className={styles.section} aria-label="Replay evidence">
          <h2>Evidence</h2>
          <pre>{JSON.stringify(item.evidence, null, 2)}</pre>
        </section>

        {item.status === "PENDING" ? (
          <section className={styles.section} aria-label="Sign replay decision">
            <h2>Sign the decision</h2>
            <p>
              I confirm that I have reviewed the stated evidence and make this
              decision within my assigned authority.
            </p>
            <ReplayDecideForm replayId={item.id} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
