import type { ApplicationReview } from "@sis/contracts";
import { loadApplicant } from "../server";
import { ApplicationCaseNav, ApplicationUnavailable } from "../chrome";
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
  if (!r.data) {
    return <ApplicationUnavailable message={r.message} />;
  }
  const submitted =
    r.data.application.state === "Submitted" ||
    r.data.application.state === "Withdrawn";
  return (
    <>
      <Workspace initial={r.data} section="overview" />
      {submitted ? <ApplicationCaseNav applicationId={id} /> : null}
    </>
  );
}
