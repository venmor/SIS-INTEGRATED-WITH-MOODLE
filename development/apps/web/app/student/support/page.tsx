import Link from "next/link";
import { Notice, PageHeader } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import {
  loadSupport,
  supportCategory,
  supportStatus,
  type AcademicSupportReadiness,
  type AcademicSupportSummary,
} from "../../../lib/support";
import { AcademicRequestForm } from "./request-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Requests and support",
  robots: { index: false, follow: false },
};

export default async function StudentSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const query = new URLSearchParams({ take: "20" });
  if (cursor) query.set("cursor", cursor);
  const [ready, requests] = await Promise.all([
    loadSupport<AcademicSupportReadiness>("me", "/student/support"),
    loadSupport<{ items: AcademicSupportSummary[]; nextCursor: string | null }>(
      `me/requests?${query}`,
      "/student/support",
    ),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Student portal · Academic help"
        title="Requests and support"
        lede="Ask for academic help and follow replies from your adviser."
      />
      {!ready.data ? (
        <Notice
          severity="warning"
          title="Support route unavailable"
          message={ready.message}
        />
      ) : ready.data.available && ready.data.receiver ? (
        <section
          aria-labelledby="adviser-title"
          className="grid gap-4 rounded-sis border border-sis-border bg-sis-surface p-5 shadow-sis sm:p-6"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sis-muted">
              Your academic adviser
            </p>
            <h2 id="adviser-title" className="mt-1 text-xl font-semibold">
              {ready.data.receiver.name}
            </h2>
            <p className="mt-1 text-sm text-sis-muted">
              {ready.data.receiver.service} · {ready.data.programmeName} ·{" "}
              {ready.data.campus}
            </p>
          </div>
          <p className="max-w-3xl text-sm leading-6">
            Your request goes to this adviser in the secure portal. Your
            lecturer and other students cannot view this case.
          </p>
          <AcademicRequestForm receiver={ready.data.receiver.name} />
        </section>
      ) : (
        <Notice
          severity="info"
          title="Academic adviser not ready"
          message={
            ready.data.reason ??
            "A receiving route is not available. Ask your programme office for the current contact route."
          }
        />
      )}
      <section
        aria-labelledby="support-history-title"
        className="grid gap-4 border-t border-sis-border pt-6"
      >
        <div>
          <h2 id="support-history-title" className="text-xl font-semibold">
            My requests
          </h2>
          <p className="mt-1 text-sm text-sis-muted">
            Academic requests and secure replies appear here.
          </p>
        </div>
        {!requests.data ? (
          <Notice
            severity="warning"
            title="Request history unavailable"
            message={requests.message}
          />
        ) : requests.data.items.length === 0 ? (
          <p className="rounded-sis border border-sis-border bg-sis-surface p-5 text-sis-muted">
            No academic-support requests yet.
          </p>
        ) : (
          <ul className="grid list-none gap-3">
            {requests.data.items.map((item) => (
              <li
                key={item.id}
                className="rounded-sis border border-sis-border bg-sis-surface p-4 shadow-sis transition-colors duration-150 hover:border-sis-brand motion-reduce:transition-none sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">
                    <Link href={`/student/support/${item.id}`}>
                      {supportCategory(item.category)} · {item.reference}
                    </Link>
                  </h3>
                  <span className="rounded-full bg-sis-info-bg px-3 py-1 text-sm font-semibold text-sis-info-text">
                    {supportStatus(item.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-sis-muted">
                  Received by {item.owner} · {formatLusaka(item.createdAt)}
                </p>
                <Link
                  className="mt-3 inline-flex min-h-11 items-center font-semibold"
                  href={`/student/support/${item.id}`}
                >
                  View request and replies →
                </Link>
              </li>
            ))}
          </ul>
        )}
        <nav
          aria-label="My support request pages"
          className="flex flex-wrap gap-4 text-sm font-semibold"
        >
          {cursor ? <Link href="/student/support">First page</Link> : null}
          {requests.data?.nextCursor ? (
            <Link
              href={`/student/support?cursor=${encodeURIComponent(requests.data.nextCursor)}`}
            >
              Next page
            </Link>
          ) : null}
        </nav>
      </section>
      <p className="text-sm leading-6 text-sis-muted">
        This portal is not monitored as an emergency channel. If someone is in
        immediate danger, use your institution’s verified emergency contact or
        local emergency services.
      </p>
    </>
  );
}
