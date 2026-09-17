import { cookies } from "next/headers";
import type { ReviewSchedule } from "@sis/contracts";
import { Empty } from "@sis/ui";
import styles from "../../../page.module.css";
import { DecideForm } from "./decide-form";

export const dynamic = "force-dynamic";

async function loadReview(id: string): Promise<ReviewSchedule | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/reviews?take=100`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as ReviewSchedule[];
    return rows.find((r) => r.id === id) ?? null;
  } catch {
    return null;
  }
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await loadReview(id);
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Access review</p>
        <h1 className={styles.title}>Review assignment</h1>
        {!review ? (
          <Empty
            caseVariant="action"
            title="Review not available"
            message="This review is completed, reassigned, or outside your reviewer scope."
            action={{ label: "Back to queue", href: "/admin/reviews" }}
          />
        ) : (
          <DecideForm review={review} />
        )}
      </main>
    </div>
  );
}
