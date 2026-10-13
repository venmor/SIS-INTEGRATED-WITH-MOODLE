import Link from "next/link";
import type { ResultPublicationWorkspace } from "@sis/contracts";
import { Notice, PageHeader } from "@sis/ui";
import { loadResult } from "../../../result-server";
import { PublicationDecisionForm } from "../../forms";
export const dynamic = "force-dynamic";
export default async function AmendmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await loadResult<
    ResultPublicationWorkspace["amendments"][number]
  >(`/amendments/${id}`, `/admin/assessment/publications/amendments/${id}`);
  const item = workspace.data;
  return (
    <main>
      <PageHeader
        eyebrow="Examinations"
        title="Review result amendment"
        lede="An approved correction preserves original results and opens downstream academic impact reviews."
      />
      <p>
        <Link href="/admin/assessment/publications">Amendment queue</Link>
      </p>
      {!item ? (
        <Notice
          severity="warning"
          title="Amendment unavailable"
          message={
            workspace.message ||
            "This request is unavailable in your current workspace."
          }
        />
      ) : (
        <>
          <dl>
            <dt>Reason</dt>
            <dd>{item.reason}</dd>
            <dt>Evidence reference</dt>
            <dd>{item.evidenceRef}</dd>
            <dt>State</dt>
            <dd>{item.status}</dd>
          </dl>
          <p>
            <Link href={`/admin/assessment/packages/${item.packageId}`}>
              Review replacement board package
            </Link>
          </p>
          <p>
            The approval must be independent of the amendment requester and
            result preparer. It will not silently change registration, finance
            or Moodle access.
          </p>
          {item.status === "SUBMITTED" ? (
            <PublicationDecisionForm
              target={item.id}
              version={item.version}
              amendment
            />
          ) : (
            <p>This amendment has already been decided.</p>
          )}
        </>
      )}
    </main>
  );
}
