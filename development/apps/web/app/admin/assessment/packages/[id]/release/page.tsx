import Link from "next/link";
import type { ResultPackageDetailView } from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { loadResult } from "../../../result-server";
import { PublicationDecisionForm } from "../../../publications/forms";
export const dynamic = "force-dynamic";
export default async function ReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, message } = await loadResult<ResultPackageDetailView>(
    `/packages/${id}`,
    `/admin/assessment/packages/${id}/release`,
  );
  return (
    <main>
      <PageHeader
        eyebrow="Examinations"
        title="Review official result release"
        lede="Publication is a separate authorized decision after board approval."
      />
      <p>
        <Link href={`/admin/assessment/packages/${id}`}>
          Review full board evidence
        </Link>{" "}
        · <Link href="/admin/assessment/publications">Publication history</Link>
      </p>
      {!data ? (
        <Notice
          severity="warning"
          title="Package unavailable"
          message={message}
        />
      ) : (
        <>
          <dl>
            <dt>Offering and period</dt>
            <dd>
              {data.offeringRef} · {data.periodCode}
            </dd>
            <dt>State</dt>
            <dd>{data.status}</dd>
            <dt>Reviewed version</dt>
            <dd>{data.version}</dd>
          </dl>
          <p>
            Authority: an active examinations assignment with explicit
            publication capability for this period. Preparers and markers cannot
            publish their own results.
          </p>
          {data.status === "APPROVED_FOR_RELEASE" ? (
            <PublicationDecisionForm target={id} version={data.version} />
          ) : (
            <Notice
              severity="info"
              title="Release unavailable"
              message="Only an unconditionally approved package can be released. Published records require the controlled amendment route."
            />
          )}
        </>
      )}
    </main>
  );
}
