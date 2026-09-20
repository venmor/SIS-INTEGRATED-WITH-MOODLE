import type { ApplicationReview } from "@sis/contracts";
import { loadApplicant } from "../server";
import { ApplicationUnavailable } from "../chrome";
import { Workspace } from "../workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<ApplicationReview>(
    `/${id}/review`,
    `/applicant/${id}`,
  );
  return r.data ? (
    <Workspace initial={r.data} section="overview" />
  ) : (
    <ApplicationUnavailable message={r.message} />
  );
}
