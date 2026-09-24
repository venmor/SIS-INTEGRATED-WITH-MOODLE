import { cookies } from "next/headers";
import Link from "next/link";
import type { TutorialGroupView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { GroupForms } from "./forms";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/teaching${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// Coordinator TG workspace: SIS-authoritative tutorial groups. Groups
// activate only with a tutor; allocations never over-enrol. Moodle only
// ever mirrors these records.
export default async function TeachingGroupsPage() {
  const list = await loadStaff<{ items: TutorialGroupView[] }>("/groups");
  if (!list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Tutorial groups</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs coordinator authority. Sign in with a coordinator role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Tutorial groups</h1>
        <p>
          <Link href="/">Workspace home</Link>
        </p>
        {list.data.items.length === 0 ? (
          <p>No tutorial groups yet.</p>
        ) : (
          <ul>
            {list.data.items.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.name} · {item.status}
                </strong>{" "}
                — {item.allocated}/{item.capacity} allocated · {item.programme}{" "}
                {item.intake} · ID {item.id}
              </li>
            ))}
          </ul>
        )}
        <GroupForms />
      </main>
    </div>
  );
}
