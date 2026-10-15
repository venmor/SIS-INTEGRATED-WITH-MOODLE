import staffUi from "../../staff-workspace.module.css";
import Link from "next/link";
import type {
  ResultPublicationWorkspace,
  ResultPackageView,
} from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import { loadResult } from "../result-server";
import { AmendmentRequestForm } from "./forms";
export const dynamic = "force-dynamic";
export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ releaseCursor?: string; amendmentCursor?: string }>;
}) {
  const cursors = await searchParams;
  const query = new URLSearchParams();
  if (cursors.releaseCursor) query.set("releaseCursor", cursors.releaseCursor);
  if (cursors.amendmentCursor)
    query.set("amendmentCursor", cursors.amendmentCursor);
  const [workspace, packages] = await Promise.all([
    loadResult<ResultPublicationWorkspace>(
      `/publications?${query}`,
      "/admin/assessment/publications",
    ),
    loadResult<{ items: ResultPackageView[] }>(
      "/packages",
      "/admin/assessment/publications",
    ),
  ]);
  return (
    <main className={staffUi.workspace}>
      <PageHeader
        eyebrow="Examinations"
        title="Official publication and amendments"
        lede="Published batches remain traceable. Corrections use a separately approved replacement package."
      />
      <p>
        <Link href="/admin/assessment/packages">Board packages</Link>
      </p>
      {!workspace.data ? (
        <Notice
          severity="warning"
          title="Publication workspace unavailable"
          message={workspace.message}
        />
      ) : (
        <>
          <section className={staffUi.panel}>
            <h2 className={staffUi.sectionHeading}>Publication history</h2>
            {workspace.data.releases.length ? (
              <ul className={staffUi.recordList}>
                {workspace.data.releases.map((r) => (
                  <li key={r.id}>
                    {r.offeringRef} · {r.periodCode} ·{" "}
                    {formatLusaka(r.publishedAt)} ·{" "}
                    {r.current ? "Current" : "Superseded"}
                    <br />
                    Reference: {r.id}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={staffUi.empty}>
                No official batches have been published in this workspace.
              </p>
            )}
          </section>
          <section className={staffUi.panel}>
            <h2 className={staffUi.sectionHeading}>Amendment queue</h2>
            {workspace.data.amendments.length ? (
              <ul className={staffUi.recordList}>
                {workspace.data.amendments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/assessment/publications/amendments/${a.id}`}
                    >
                      Review amendment · {a.status}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={staffUi.empty}>No result amendments requested.</p>
            )}
            <nav aria-label="Publication pages">
              <Link href="/admin/assessment/publications">Newest records</Link>
              {workspace.data.nextReleaseCursor ? (
                <p>
                  <Link
                    href={`?releaseCursor=${workspace.data.nextReleaseCursor}`}
                  >
                    Older releases
                  </Link>
                </p>
              ) : null}
              {workspace.data.nextAmendmentCursor ? (
                <p>
                  <Link
                    href={`?amendmentCursor=${workspace.data.nextAmendmentCursor}`}
                  >
                    Older amendments
                  </Link>
                </p>
              ) : null}
            </nav>
            <AmendmentRequestForm
              releases={workspace.data.releases.filter((r) => r.current)}
              packages={(packages.data?.items ?? []).filter(
                (p) => p.status === "APPROVED_FOR_RELEASE",
              )}
            />
          </section>
        </>
      )}
    </main>
  );
}
