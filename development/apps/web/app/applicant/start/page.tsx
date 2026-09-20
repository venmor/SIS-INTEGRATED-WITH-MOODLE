import { loadApplicant } from "../server";
import { ApplicationUnavailable } from "../chrome";
import { StartForm } from "../workspace";
import type { ApplicationPolicy } from "@sis/contracts";
export default async function Start({
  searchParams,
}: {
  searchParams: Promise<{ offeringId?: string }>;
}) {
  const { offeringId } = await searchParams;
  const result = await loadApplicant<ApplicationPolicy>(
    "/policy",
    `/applicant/start?offeringId=${encodeURIComponent(offeringId ?? "")}`,
  );
  if (!result.data) return <ApplicationUnavailable message={result.message} />;
  return <StartForm offeringId={offeringId ?? ""} policy={result.data} />;
}
