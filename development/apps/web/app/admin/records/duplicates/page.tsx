import { cookies } from "next/headers";
import type { IdentityCandidateView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../../page.module.css";
import { DuplicateQueue } from "./queue";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/records${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

export default async function DuplicatesPage() {
  const candidates =
    await loadStaff<{ items: IdentityCandidateView[] }>("/duplicates");
  if (!candidates.ok) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Identity review queue</h1>
          <Notice
            severity="warning"
            title="Queue unavailable"
            message="This queue needs a records workspace. Sign in with records authority or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Identity review queue</h1>
        <p className={styles.lede}>
          Possible duplicate identities awaiting a human decision. People are
          never merged automatically.
        </p>
        <DuplicateQueue initial={candidates.data.items} />
      </main>
    </div>
  );
}
