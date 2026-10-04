import { cookies } from "next/headers";
import type { ReviewQueueItem } from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../../page.module.css";
import { AdmissionsQueue } from "./queue";

export const dynamic = "force-dynamic";

type QueueScope = "mine" | "pool";
type QueueResult = {
  items: ReviewQueueItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

async function loadQueue(
  query: string,
): Promise<
  | { ok: true; result: QueueResult }
  | { ok: false; status: number; code?: string }
> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/review/queue${query}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as { code?: string };
      return { ok: false, status: res.status, code: error.code };
    }
    return { ok: true, result: (await res.json()) as QueueResult };
  } catch {
    return { ok: false, status: 503 };
  }
}

export default async function AdmissionsQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const scope: QueueScope = single(params.scope) === "pool" ? "pool" : "mine";
  const state = scope === "pool" ? "Submitted" : (single(params.state) ?? "");
  const actionNeeded = single(params.actionNeeded) === "true";
  const reference = single(params.reference) ?? "";
  const sort = single(params.sort) === "newest" ? "newest" : "oldest";
  const cursor = single(params.cursor) ?? null;
  const take = single(params.take);
  const query = new URLSearchParams({ scope });
  if (state) query.set("state", state);
  if (actionNeeded) query.set("actionNeeded", "true");
  if (reference) query.set("reference", reference);
  if (sort === "newest") query.set("sort", sort);
  if (take) query.set("take", take);
  if (cursor) query.set("cursor", cursor);
  const loaded = await loadQueue(`?${query.toString()}`);
  if (!loaded.ok) {
    const status = loaded.status;
    const stalePage = cursor && loaded.code === "QUEUE_CURSOR_INVALID";
    const restart = new URLSearchParams(query);
    restart.delete("cursor");
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Admissions queue</h1>
          <Notice
            severity="warning"
            title={
              stalePage
                ? "Queue page expired"
                : status === 401 || status === 403
                  ? "Restricted area"
                  : "Queue unavailable"
            }
            message={
              stalePage
                ? "This page link is no longer valid. Restart at the first page with the same filters."
                : status === 401 || status === 403
                  ? "The admissions queue needs a reviewer workspace. Switch to one, or ask an administrator."
                  : "We could not reach the review service. Your claimed cases are kept. Try again shortly."
            }
            action={
              stalePage
                ? {
                    label: "Restart from first page",
                    href: `/admin/admissions/queue?${restart.toString()}`,
                  }
                : { label: "Back home", href: "/" }
            }
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Admissions queue</h1>
        <p className={styles.lede}>Review assigned cases and claim new work.</p>
        <AdmissionsQueue
          initialItems={loaded.result.items}
          initialScope={scope}
          initialState={state}
          initialActionNeeded={actionNeeded}
          initialReference={reference}
          initialSort={sort}
          initialCursor={cursor}
          initialNextCursor={loaded.result.nextCursor}
          initialHasMore={loaded.result.hasMore}
          take={take ? Number(take) : 50}
        />
      </main>
    </div>
  );
}
