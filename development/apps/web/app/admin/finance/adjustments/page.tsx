import { cookies } from "next/headers";
import Link from "next/link";
import type { AdjustmentView } from "@sis/contracts";
import { DataTable, Money, Notice, PageHeader, StatusChip } from "@sis/ui";
import { AdjustmentForms } from "./forms";
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

// Adjustments and refunds: officers request, approvers decide (never the
// same person). Approved credits post compensating lines.
export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; kind?: string; sort?: string }>;
}) {
  const { cursor, kind, sort } = await searchParams;
  const query = new URLSearchParams({ take: "20" });
  if (kind) query.set("kind", kind);
  if (sort) query.set("sort", sort);
  if (cursor) query.set("cursor", cursor);
  const context = new URLSearchParams();
  if (kind) context.set("kind", kind);
  if (sort) context.set("sort", sort);
  const firstPage = `/admin/finance/adjustments${context.size ? `?${context}` : ""}`;
  const list = await loadStaff<{
    items: AdjustmentView[];
    actions: { request: boolean; decide: boolean };
    total: number;
    nextCursor: string | null;
  }>(`/adjustments?${query}`);
  if (!list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <PageHeader
            eyebrow="Finance workspace"
            title="Adjustments and refunds"
          />
          <Notice
            severity="warning"
            title={
              list.status === 400 && cursor
                ? "Adjustment page unavailable"
                : "Workspace unavailable"
            }
            message={
              list.status === 400 && cursor
                ? "This queue page is no longer available. Restart with the same filters."
                : "This workspace needs finance authority. Sign in with a finance role or ask an administrator."
            }
            action={
              list.status === 400 && cursor
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
          title="Adjustments and refunds"
          lede="Officers request; approvers decide — never the same person. Approved credits post compensating lines."
        />
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <form
          action="/admin/finance/adjustments"
          method="get"
          aria-label="Filter finance adjustments"
          className="grid gap-4 rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_auto] sm:items-end"
        >
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="adjustment-kind"
          >
            Review kind
            <select
              id="adjustment-kind"
              name="kind"
              defaultValue={kind ?? "ALL"}
              className="min-h-11 rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
            >
              <option value="ALL">All pending</option>
              <option value="CREDIT_NOTE">Credit notes</option>
              <option value="WAIVER">Waivers</option>
              <option value="REFUND">Refunds</option>
            </select>
          </label>
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="adjustment-sort"
          >
            Order
            <select
              id="adjustment-sort"
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
        <p className="text-sm text-sis-muted" role="status">
          {list.data.total} requests match this view · Showing{" "}
          {list.data.items.length} on this page
        </p>
        <DataTable
          title="Adjustments awaiting decision"
          description="Credit notes, waivers and refunds with reasons and amounts."
          columns={[
            {
              heading: "Kind",
              render: (item) => <strong>{item.kind}</strong>,
            },
            {
              heading: "Amount",
              numeric: true,
              render: (item) => (
                <Money
                  currency={item.currency}
                  amountMinor={item.amountMinor}
                />
              ),
            },
            {
              heading: "Reason",
              render: (item) => item.reason,
            },
            {
              heading: "State",
              render: (item) => (
                <StatusChip tone="attention">{item.status}</StatusChip>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No adjustments awaiting decision."
        />
        <nav
          aria-label="Adjustment pages"
          className="flex flex-wrap gap-4 text-sm font-semibold"
        >
          {cursor ? <Link href={firstPage}>First page</Link> : null}
          {list.data.nextCursor ? (
            <Link
              href={`/admin/finance/adjustments?${new URLSearchParams({ ...Object.fromEntries(context), cursor: list.data.nextCursor })}`}
            >
              Next page
            </Link>
          ) : null}
        </nav>
        <AdjustmentForms
          adjustments={list.data.items}
          canRequest={list.data.actions.request}
          canDecide={list.data.actions.decide}
        />
      </main>
    </div>
  );
}
