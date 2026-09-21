import type { ApplicationReview } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationUnavailable } from "../../chrome";
import { Workspace } from "../../workspace";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; section: string }>;
}) {
  const { id, section } = await params;
  if (
    ![
      "personal",
      "contact",
      "qualifications",
      "documents",
      "review",
      "receipt",
      "programme",
      "status",
      "clarifications",
      "corrections",
      "decision",
      "tickets",
      "withdraw",
      "notifications",
    ].includes(section)
  )
    notFound();
  const r = await loadApplicant<ApplicationReview>(
    `/${id}/review`,
    `/applicant/${id}/${section}`,
  );
  return r.data ? (
    <Workspace initial={r.data} section={section} />
  ) : (
    <ApplicationUnavailable message={r.message} />
  );
}
