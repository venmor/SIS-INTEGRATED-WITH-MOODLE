import { cookies } from "next/headers";
import type { ReviewSchedule } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../page.module.css";
import { ReviewQueue } from "./queue";

export const dynamic = "force-dynamic";

async function loadPendingReviews(): Promise<
  { ok: true; reviews: ReviewSchedule[] } | { ok: false; status: number }
> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/reviews?status=pending&take=21`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, reviews: (await res.json()) as ReviewSchedule[] };
  } catch {
    return { ok: false, status: 503 };
  }
}

export default async function ReviewsPage() {
  const loaded = await loadPendingReviews();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Access reviews</h1>
        {!loaded.ok ? (
          <Notice
            severity="warning"
            title="Restricted area"
            message="Access reviews need a reviewer workspace. Switch to one, or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        ) : (
          <>
            <p className={styles.lede}>
              Confirm each assignment is still required. Revocation takes effect
              immediately and is audited.
            </p>
            <ReviewQueue initial={loaded.reviews} />
          </>
        )}
      </main>
    </div>
  );
}
