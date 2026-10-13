import { cookies } from "next/headers";
import Link from "next/link";
import type { ReconCaseView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
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

// Reconciliation queue: unreconciled, uncertain, duplicate and mismatch
// cases first. Originals are never edited here; resolution opens the case.
export default async function FinanceCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; status?: string; sort?: string }>;
}) {
  const { cursor, status, sort } = await searchParams;
  const query = new URLSearchParams({ take: "20" });
  if (status) query.set("status", status);
  if (sort) query.set("sort", sort);
  if (cursor) query.set("cursor", cursor);
  const queue = await loadStaff<{
    items: ReconCaseView[];
    total: number;
    nextCursor: string | null;
  }>(`/cases?${query}`);
  const context = new URLSearchParams();
  if (status) context.set("status", status);
  if (sort) context.set("sort", sort);
  const firstPage = `/admin/finance/cases${context.size ? `?${context}` : ""}`;
  if (!queue.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Finance workspace"
            title="Reconciliation queue"
          />
          <Notice
            severity="warning"
            title={
              queue.status === 400 && cursor
                ? "Case page unavailable"
                : "Queue unavailable"
            }
            message={
              queue.status === 400 && cursor
                ? "This queue page is no longer available. Restart with the same filters."
                : "This queue needs finance authority or is temporarily unavailable. Switch workspace or try again."
            }
            action={
              queue.status === 400 && cursor
                ? { label: "First page", href: firstPage }
                : { label: "Finance workspace", href: "/admin/finance" }
            }
          />
        </main>
      </div>
    );
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <PageHeader
          eyebrow="Student Information System"
          title="Reconciliation queue"
          lede="Uncertain, duplicate and mismatch payments waiting for review. Originals are never edited here; resolution opens the case."
        />
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <form
          action="/admin/finance/cases"
          method="get"
          aria-label="Filter reconciliation cases"
          className="grid gap-4 rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_auto] sm:items-end"
        >
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="finance-case-status"
          >
            Case status
            <select
              id="finance-case-status"
              name="status"
              defaultValue={status ?? "ALL"}
              className="min-h-11 rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
            >
              <option value="ALL">Open and escalated</option>
              <option value="OPEN">Open</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </label>
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="finance-case-sort"
          >
            Order
            <select
              id="finance-case-sort"
              name="sort"
              defaultValue={sort ?? "oldest"}
              className="min-h-11 rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-sis bg-sis-brand px-5 font-semibold text-white transition-colors duration-150 hover:bg-sis-brand-strong motion-reduce:transition-none"
          >
            Apply queue filters
          </button>
        </form>
        <p className="flex flex-wrap items-center gap-2 text-sm text-sis-muted">
          {status && status !== "ALL" ? (
            <>
              Applied filter:
              <Link
                className="rounded-full border border-sis-border bg-sis-surface px-3 py-1 font-semibold"
                href={`/admin/finance/cases${sort ? `?sort=${encodeURIComponent(sort)}` : ""}`}
              >
                {status === "OPEN" ? "Open" : "Escalated"} ×
              </Link>
            </>
          ) : (
            "No status filter"
          )}
          <span>· {sort === "newest" ? "Newest first" : "Oldest first"}</span>
        </p>
        <p className="text-sm text-sis-muted" role="status">
          {queue.data.total} cases match this view · Showing{" "}
          {queue.data.items.length} on this page
        </p>
        {queue.data.items.length === 0 ? (
          <Notice
            severity="info"
            title={
              status && status !== "ALL" ? "No cases match" : "Queue clear"
            }
            message={
              status && status !== "ALL"
                ? "No cases match this status. Change or clear the filter."
                : "No open reconciliation cases. Uncertain, duplicate and mismatched payments will appear here."
            }
          />
        ) : (
          <DataTable
            title="Open reconciliation cases"
            description="Uncertain, duplicate and mismatch payments with safe next steps."
            columns={[
              {
                heading: "Case",
                render: (item) => (
                  <Link href={`/admin/finance/cases/${item.id}`}>
                    {item.kind}
                  </Link>
                ),
              },
              {
                heading: "State",
                render: (item) => (
                  <StatusChip
                    tone={item.status === "OPEN" ? "attention" : "info"}
                  >
                    {item.status}
                  </StatusChip>
                ),
              },
              {
                heading: "Next step",
                render: (item) => item.safeMessage,
              },
            ]}
            rows={queue.data.items}
            keyOf={(item) => item.id}
            emptyText="No open reconciliation cases."
          />
        )}
        <nav
          aria-label="Reconciliation case pages"
          className="flex flex-wrap gap-4 text-sm font-semibold"
        >
          {cursor ? <Link href={firstPage}>First page</Link> : null}
          {queue.data.nextCursor ? (
            <Link
              href={`/admin/finance/cases?${new URLSearchParams({ ...Object.fromEntries(context), cursor: queue.data.nextCursor })}`}
            >
              Next page
            </Link>
          ) : null}
        </nav>
      </main>
    </div>
  );
}
