import { cookies } from "next/headers";
import Link from "next/link";
import type { ArrangementView } from "@sis/contracts";
import { DataTable, Notice, PageHeader, StatusChip } from "@sis/ui";
import { ArrangementDecide } from "./forms";
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

// Payment arrangements: student requests, approver decides. Approval
// grants a time-boxed clearance entitlement, not a vague note.
export default async function ArrangementsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; sort?: string }>;
}) {
  const { cursor, sort } = await searchParams;
  const query = new URLSearchParams({ take: "20" });
  if (sort) query.set("sort", sort);
  if (cursor) query.set("cursor", cursor);
  const firstPage = `/admin/finance/arrangements${sort ? `?sort=${encodeURIComponent(sort)}` : ""}`;
  const list = await loadStaff<{
    items: ArrangementView[];
    total: number;
    nextCursor: string | null;
  }>(`/arrangements?${query}`);
  if (!list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <PageHeader
            eyebrow="Finance workspace"
            title="Payment arrangements"
          />
          <Notice
            severity="warning"
            title={
              list.status === 400 && cursor
                ? "Arrangement page unavailable"
                : "Workspace unavailable"
            }
            message={
              list.status === 400 && cursor
                ? "This queue page is no longer available. Restart with the same order."
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
          title="Payment arrangements"
          lede="Review requested payment terms before an authorized approver decides. Each decision stays individual."
        />
        <p>
          <Link href="/admin/finance">Finance workspace</Link>
        </p>
        <form
          action="/admin/finance/arrangements"
          method="get"
          aria-label="Order payment arrangements"
          className="flex flex-wrap items-end gap-4 rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis"
        >
          <label
            className="grid gap-2 text-sm font-semibold"
            htmlFor="arrangement-sort"
          >
            Order
            <select
              id="arrangement-sort"
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
            Apply order
          </button>
        </form>
        <p className="text-sm text-sis-muted" role="status">
          {list.data.total} requests awaiting decision · Showing{" "}
          {list.data.items.length} on this page
        </p>
        <DataTable
          title="Awaiting decision"
          description="Requested terms and reasons. Select one request below for an individual decision."
          columns={[
            {
              heading: "Terms",
              render: (item) => <strong>{item.terms}</strong>,
            },
            { heading: "Reason", render: (item) => item.reason ?? "—" },
            {
              heading: "State",
              render: (item) => (
                <StatusChip tone="attention">{item.status}</StatusChip>
              ),
            },
          ]}
          rows={list.data.items}
          keyOf={(item) => item.id}
          emptyText="No arrangements awaiting decision."
        />
        <nav
          aria-label="Payment arrangement pages"
          className="flex flex-wrap gap-4 text-sm font-semibold"
        >
          {cursor ? <Link href={firstPage}>First page</Link> : null}
          {list.data.nextCursor ? (
            <Link
              href={`/admin/finance/arrangements?${new URLSearchParams({ ...(sort ? { sort } : {}), cursor: list.data.nextCursor })}`}
            >
              Next page
            </Link>
          ) : null}
        </nav>
        <h2>Decide (approver only)</h2>
        <ArrangementDecide arrangements={list.data.items} />
      </main>
    </div>
  );
}
