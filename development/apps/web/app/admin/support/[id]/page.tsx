import Link from "next/link";
import { Notice, PageHeader } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import {
  loadSupport,
  supportCategory,
  supportClosureReason,
  type AcademicSupportCase,
} from "../../../../lib/support";
import { AcademicReplyForm } from "../../../student/support/reply-form";
import { AcademicActionCard } from "../../../student/support/action-card";
import { FollowUpProposalForm } from "../follow-up-form";
import { CloseAcademicCaseForm } from "../close-case-form";

export const dynamic = "force-dynamic";

export default async function AssignedSupportCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadSupport<AcademicSupportCase>(
    `assigned/${encodeURIComponent(id)}`,
    `/admin/support/${id}`,
  );
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:px-8">
      <Link className="text-sm font-semibold" href="/admin/support">
        ← Assigned requests
      </Link>
      {!loaded.data ? (
        <>
          <PageHeader
            eyebrow="Adviser workspace · Academic help"
            title="Request unavailable"
            lede="This case is not assigned to your selected adviser appointment."
          />
          <Notice
            severity="warning"
            title="Request unavailable"
            message={loaded.message}
          />
        </>
      ) : (
        <>
          <PageHeader
            eyebrow={`Adviser workspace · ${loaded.data.reference}`}
            title={supportCategory(loaded.data.category)}
            lede={`${loaded.data.student.name} · ${loaded.data.student.number}`}
          />
          <section
            aria-label="Student request"
            className="grid gap-2 rounded-sis border border-sis-border bg-sis-surface p-5"
          >
            <h2 className="text-lg font-semibold">Student request</h2>
            <p className="text-sm text-sis-muted">
              Received {formatLusaka(loaded.data.createdAt)} · Preferred
              contact: Secure portal
            </p>
            <p className="whitespace-pre-wrap">
              {loaded.data.details ??
                "The student prefers to be contacted without providing details."}
            </p>
            {loaded.data.closure ? (
              <p className="rounded-sis border border-sis-border bg-sis-info-bg p-4 text-sm">
                Completed · {supportClosureReason(loaded.data.closure.reason)} ·{" "}
                {formatLusaka(loaded.data.closure.closedAt)}
              </p>
            ) : null}
          </section>
          <section aria-labelledby="follow-up-title" className="grid gap-3">
            <h2 id="follow-up-title" className="text-xl font-semibold">
              Academic follow-up
            </h2>
            {loaded.data.actions.length === 0 ? (
              <p className="text-sm text-sis-muted">
                No student action has been proposed for this request.
              </p>
            ) : (
              <div className="grid gap-3">
                {loaded.data.actions.map((action) => (
                  <AcademicActionCard
                    key={action.id}
                    action={action}
                    requestId={loaded.data!.id}
                    role="ADVISER"
                  />
                ))}
              </div>
            )}
            {!loaded.data.closure &&
            !loaded.data.actions.some((action) =>
              ["PROPOSED", "ACCEPTED", "CLAIMED_COMPLETE"].includes(
                action.status,
              ),
            ) ? (
              <FollowUpProposalForm requestId={loaded.data.id} />
            ) : null}
          </section>
          <section aria-labelledby="conversation-title" className="grid gap-3">
            <h2 id="conversation-title" className="text-xl font-semibold">
              Conversation
            </h2>
            {loaded.data.messages.length === 0 ? (
              <p className="text-sis-muted">
                No replies yet. The student is waiting for a response in the
                secure portal.
              </p>
            ) : (
              <ol className="grid list-none gap-3">
                {loaded.data.messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-sis border border-sis-border bg-sis-surface p-4"
                  >
                    <p className="text-sm font-semibold">
                      {message.authorRole === "STUDENT"
                        ? loaded.data!.student.name
                        : "You"}{" "}
                      · {formatLusaka(message.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {!loaded.data.closure ? (
            <>
              <AcademicReplyForm
                path={`assigned/${loaded.data.id}/replies`}
                recipient={loaded.data.student.name}
              />
              <CloseAcademicCaseForm
                requestId={loaded.data.id}
                hasActiveAction={loaded.data.actions.some((action) =>
                  ["PROPOSED", "ACCEPTED", "CLAIMED_COMPLETE"].includes(
                    action.status,
                  ),
                )}
              />
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
