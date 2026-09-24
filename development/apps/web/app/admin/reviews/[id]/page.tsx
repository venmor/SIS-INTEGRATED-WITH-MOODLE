import { cookies } from "next/headers";
import type { ReviewSchedule } from "@sis/contracts";
import { Empty, Notice } from "@sis/ui";
import styles from "../../../page.module.css";
import { DecideForm } from "./decide-form";

export const dynamic = "force-dynamic";

type ReviewLoadState =
  | { kind: "ok"; review: ReviewSchedule }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "unavailable" };

async function loadReview(id: string): Promise<ReviewLoadState> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { kind: "denied" };
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return { kind: "missing" };
  }

  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/reviews/${id}`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) return { kind: "denied" };
    if (res.status === 404) return { kind: "missing" };
    if (!res.ok) return { kind: "unavailable" };
    return { kind: "ok", review: (await res.json()) as ReviewSchedule };
  } catch {
    return { kind: "unavailable" };
  }
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadReview(id);
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Access review</p>
        <h1 className={styles.title}>Review assignment</h1>
        {loaded.kind === "ok" ? (
          <DecideForm review={loaded.review} />
        ) : loaded.kind === "missing" ? (
          <Empty
            caseVariant="action"
            title="Review not available"
            message="This review is completed, removed, or no longer available at this reference."
            action={{ label: "Back to queue", href: "/admin/reviews" }}
          />
        ) : (
          <Notice
            severity="warning"
            title={
              loaded.kind === "denied"
                ? "Access review authority unavailable"
                : "Access review temporarily unavailable"
            }
            message={
              loaded.kind === "denied"
                ? "This review needs an administrator workspace."
                : "The identity service could not confirm this review. Do not make a decision from stale evidence; restore connectivity, then retry."
            }
            action={
              loaded.kind === "denied"
                ? { label: "Back to queue", href: "/admin/reviews" }
                : { label: "Retry review", href: `/admin/reviews/${id}` }
            }
          />
        )}
      </main>
    </div>
  );
}
