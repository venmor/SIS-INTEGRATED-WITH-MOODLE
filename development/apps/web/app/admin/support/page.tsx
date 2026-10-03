import Link from "next/link";
import { Notice, PageHeader } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import { SupportQueueFilters } from "./filters";
import {
  loadSupport,
  supportCategory,
  type AcademicSupportCase,
} from "../../../lib/support";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Assigned academic support",
  robots: { index: false, follow: false },
};

type AssignedSummary = Pick<
  AcademicSupportCase,
  | "id"
  | "reference"
  | "category"
  | "status"
  | "createdAt"
  | "contactMethod"
  | "details"
  | "student"
>;

interface WorkloadOverview {
  source: string;
  definitionsVersion: string;
  asOf: string;
  targetDateZone: string;
  counts: {
    openCases: number;
    needsReply: number;
    needsConfirmation: number;
    pastTarget: number;
    completedCases: number;
  };
}

export default async function AssignedSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    status?: string;
    reference?: string;
  }>;
}) {
  const { cursor, status, reference } = await searchParams;
  const query = new URLSearchParams({ take: "20" });
  if (cursor) query.set("cursor", cursor);
  if (status) query.set("status", status);
  if (reference) query.set("reference", reference);
  const filters = new URLSearchParams();
  if (status) filters.set("status", status);
  if (reference) filters.set("reference", reference);
  const firstPage = `/admin/support${filters.size ? `?${filters}` : ""}`;
  const [loaded, overview] = await Promise.all([
    loadSupport<{
      items: AssignedSummary[];
      nextCursor: string | null;
    }>(`assigned?${query}`, "/admin/support"),
    loadSupport<WorkloadOverview>("assigned/overview", "/admin/support"),
  ]);
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Adviser workspace · Academic help"
        title="Assigned support requests"
        lede="Requests sent to your selected adviser appointment. Open a case to reply in the secure portal."
      />
      {overview.data ? (
        <section aria-label="Assigned workload" className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Open cases",
                count: overview.data.counts.openCases,
                href: "/admin/support?status=OPEN",
              },
              {
                label: "Needs reply",
                count: overview.data.counts.needsReply,
                href: "/admin/support?status=NEEDS_REPLY",
              },
              {
                label: "Needs confirmation",
                count: overview.data.counts.needsConfirmation,
                href: "/admin/support/follow-ups?view=NEEDS_CONFIRMATION",
              },
              {
                label: "Past target",
                count: overview.data.counts.pastTarget,
                href: "/admin/support/follow-ups?view=PAST_TARGET",
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="grid gap-1 rounded-sis border border-sis-border bg-sis-surface p-4 no-underline hover:border-sis-brand"
              >
                <span className="text-sm font-semibold text-sis-muted">
                  {item.label}
                </span>
                <strong className="text-2xl text-sis-text">{item.count}</strong>
                <span className="text-sm">View work →</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-sis-muted">
            Assigned academic-support records · As of{" "}
            {formatLusaka(overview.data.asOf)} ·{" "}
            {overview.data.definitionsVersion}. Past target means an open action
            whose agreed date has passed in Zambia; it is not a service-level
            breach.{" "}
            <Link href="/admin/support?status=CLOSED">
              Completed cases: {overview.data.counts.completedCases}
            </Link>
            .
          </p>
        </section>
      ) : (
        <Notice
          severity="warning"
          title="Workload summary unavailable"
          message={overview.message}
        />
      )}
      <Link
        className="inline-flex min-h-11 w-fit items-center rounded-sis border border-sis-border bg-sis-surface px-4 font-semibold"
        href="/admin/support/follow-ups"
      >
        View academic follow-ups →
      </Link>
      <SupportQueueFilters
        status={status ?? "ALL"}
        reference={reference ?? ""}
      />
      {status || reference ? (
        <Link className="w-fit text-sm font-semibold" href="/admin/support">
          Clear filters
        </Link>
      ) : null}
      {!loaded.data ? (
        <Notice
          severity="warning"
          title="Assigned requests unavailable"
          message={loaded.message}
        />
      ) : loaded.data.items.length === 0 ? (
        <p className="rounded-sis border border-sis-border bg-sis-surface p-5 text-sis-muted">
          {status === "NEEDS_REPLY"
            ? "No requests need your reply in this view."
            : reference
              ? "No assigned request matches that reference. Check the reference or clear the search."
              : "No academic-support requests are assigned to this appointment."}
        </p>
      ) : (
        <ul className="grid list-none gap-3">
          {loaded.data.items.map((item) => (
            <li
              key={item.id}
              className="rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis transition-colors duration-150 hover:border-sis-brand motion-reduce:transition-none sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-semibold">
                  <Link href={`/admin/support/${item.id}`}>
                    {item.student.name} · {item.student.number}
                  </Link>
                </h2>
                <span className="rounded-full bg-sis-info-bg px-3 py-1 text-sm font-semibold text-sis-info-text">
                  {item.status === "RECEIVED"
                    ? "Needs reply"
                    : item.status === "STUDENT_REPLIED"
                      ? "Student replied"
                      : item.status === "CLOSED"
                        ? "Completed"
                        : "Adviser replied"}
                </span>
              </div>
              <p className="mt-2 text-sm text-sis-muted">
                {supportCategory(item.category)} · {item.reference} ·{" "}
                {formatLusaka(item.createdAt)}
              </p>
              <p className="mt-2 line-clamp-2">
                {item.details ??
                  "The student prefers to discuss the request without providing details."}
              </p>
              <Link
                className="mt-3 inline-flex min-h-11 items-center font-semibold"
                href={`/admin/support/${item.id}`}
              >
                Open request and reply →
              </Link>
            </li>
          ))}
        </ul>
      )}
      <nav
        aria-label="Assigned request pages"
        className="flex flex-wrap gap-4 text-sm font-semibold"
      >
        {cursor ? <Link href={firstPage}>First page</Link> : null}
        {loaded.data?.nextCursor ? (
          <Link
            href={`/admin/support?${new URLSearchParams({ ...Object.fromEntries(filters), cursor: loaded.data.nextCursor })}`}
          >
            Next page
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
