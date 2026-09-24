import { cookies } from "next/headers";
import Link from "next/link";
import type { SponsorshipView } from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { SponsorshipForms } from "./forms";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/finance${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// Sponsorship workspace: record coverage with evidence, confirm drafts.
// Changes create versions; expiry recalculates the student obligation.
export default async function SponsorshipsPage() {
  const list = await loadStaff<{ items: SponsorshipView[] }>("/sponsorships");
  if (!list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Student Information System"
            title="Sponsorships"
          />
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs finance authority. Sign in with a finance role or ask an administrator."
            action={{ label: "Finance workspace", href: "/admin/finance" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          eyebrow="Student Information System"
          title="Sponsorships"
          lede="Record governed funding coverage with evidence and retain versioned changes."
        />
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <h2>Record sponsorship</h2>
        <SponsorshipForms />
        <h2>Recent records</h2>
        {list.data.items.length === 0 ? (
          <p>No sponsorship records yet.</p>
        ) : (
          <ul>
            {list.data.items.map((item) => (
              <li key={item.id}>
                <strong>{item.sponsorName}</strong> — {item.status}
                {item.version ? ` · v${item.version}` : ""}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
