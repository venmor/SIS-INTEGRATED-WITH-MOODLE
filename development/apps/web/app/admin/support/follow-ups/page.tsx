import Link from "next/link";
import { Notice, PageHeader } from "@sis/ui";
import { formatLusakaDate } from "../../../../lib/time";
import { loadSupport } from "../../../../lib/support";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Academic follow-ups",
  robots: { index: false, follow: false },
};

interface FollowUpRow {
  id: string;
  requestId: string;
  reference: string;
  student: { number: string; name: string };
  title: string;
  dueOn: string;
  pastTarget: boolean;
  status: string;
  nextStep: "STUDENT" | "ADVISER";
}

export default async function AssignedFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; cursor?: string }>;
}) {
  const { view, cursor } = await searchParams;
  const selected = view ?? "ALL_OPEN";
  const query = new URLSearchParams({ take: "20", view: selected });
  if (cursor) query.set("cursor", cursor);
  const loaded = await loadSupport<{
    items: FollowUpRow[];
    nextCursor: string | null;
    asOf: string;
  }>(`assigned/actions?${query}`, "/admin/support/follow-ups");
  const firstPage = `/admin/support/follow-ups?view=${encodeURIComponent(selected)}`;
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-8">
      <Link className="w-fit text-sm font-semibold" href="/admin/support">
        ← Assigned requests
      </Link>
      <PageHeader
        eyebrow="Adviser workspace · Academic help"
        title="Academic follow-ups"
        lede="Student actions in cases assigned to your selected adviser appointment, ordered by their chosen target date."
      />
      <form
        action="/admin/support/follow-ups"
        method="get"
        aria-label="Filter academic follow-ups"
        className="flex flex-wrap items-end gap-3 rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis"
      >
        <label className="grid min-w-52 gap-2 text-sm font-semibold">
          Show follow-ups
          <select
            name="view"
            defaultValue={selected}
            className="min-h-11 rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
          >
            <option value="ALL_OPEN">All open</option>
            <option value="PAST_TARGET">Past target date</option>
            <option value="NEEDS_CONFIRMATION">Needs my confirmation</option>
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-sis bg-sis-brand px-5 font-semibold text-white"
        >
          Apply filter
        </button>
      </form>
      {!loaded.data ? (
        <Notice
          severity="warning"
          title="Follow-ups unavailable"
          message={loaded.message}
        />
      ) : (
        <>
          <p className="text-sm text-sis-muted">
            Target dates checked as of {formatLusakaDate(loaded.data.asOf)}.
            These dates are not institutional service deadlines.
          </p>
          {loaded.data.items.length === 0 ? (
            <p className="rounded-sis border border-sis-border bg-sis-surface p-5 text-sis-muted">
              {selected === "NEEDS_CONFIRMATION"
                ? "No student completion claims need your confirmation."
                : selected === "PAST_TARGET"
                  ? "No open follow-ups are past their target date."
                  : "No open academic follow-ups are assigned to this appointment."}
            </p>
          ) : (
            <ul className="grid list-none gap-3">
              {loaded.data.items.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:p-5"
                >
                  <div className="min-w-0">
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-sis-muted">
                      {item.student.name} · {item.student.number} ·{" "}
                      {item.reference}
                    </p>
                    <p className="mt-2 text-sm">
                      Target {formatLusakaDate(item.dueOn)} · Next step:{" "}
                      {item.nextStep === "ADVISER"
                        ? "Adviser confirmation"
                        : "Student response or action"}
                    </p>
                  </div>
                  <div className="grid justify-items-start gap-2 sm:justify-items-end">
                    <span className="rounded-full bg-sis-info-bg px-3 py-1 text-sm font-semibold text-sis-info-text">
                      {item.pastTarget
                        ? "Past target date"
                        : item.status === "CLAIMED_COMPLETE"
                          ? "Completion to review"
                          : "Open"}
                    </span>
                    <Link
                      className="inline-flex min-h-11 items-center font-semibold"
                      href={`/admin/support/${item.requestId}`}
                    >
                      Open follow-up →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <nav
            aria-label="Follow-up pages"
            className="flex flex-wrap gap-4 text-sm font-semibold"
          >
            {cursor ? <Link href={firstPage}>First page</Link> : null}
            {loaded.data.nextCursor ? (
              <Link
                href={`${firstPage}&cursor=${encodeURIComponent(loaded.data.nextCursor)}`}
              >
                Next page
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </main>
  );
}
