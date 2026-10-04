import Link from "next/link";
import { Notice, PageHeader } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import {
  loadSupport,
  supportCategory,
  supportClosureReason,
  supportStatus,
  type AcademicSupportCase,
} from "../../../../lib/support";
import { AcademicReplyForm } from "../reply-form";
import { AcademicActionCard } from "../action-card";

export const dynamic = "force-dynamic";

export default async function StudentSupportCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadSupport<AcademicSupportCase>(
    `me/requests/${encodeURIComponent(id)}`,
    `/student/support/${id}`,
  );
  if (!loaded.data)
    return (
      <>
        <PageHeader
          eyebrow="Student portal · Academic help"
          title="Request unavailable"
          lede="We could not open this request in your student workspace."
        />
        <Notice
          severity="warning"
          title="Request unavailable"
          message={loaded.message}
        />
        <Link href="/student/support">Back to my requests</Link>
      </>
    );
  const item = loaded.data;
  return (
    <>
      <Link className="text-sm font-semibold" href="/student/support">
        ← My requests
      </Link>
      <PageHeader
        eyebrow={`Student portal · ${item.reference}`}
        title={supportCategory(item.category)}
        lede={`Received by ${item.owner} · ${item.service}`}
      />
      <section
        className="grid gap-2 rounded-sis border border-sis-border bg-sis-surface p-5"
        aria-label="Request status"
      >
        <h2 className="text-lg font-semibold">{supportStatus(item.status)}</h2>
        <p className="text-sm text-sis-muted">
          Request sent {formatLusaka(item.createdAt)}. Contact method: Secure
          portal.
        </p>
        <p>
          {item.details ??
            "You asked to be contacted without providing details."}
        </p>
        {item.closure ? (
          <div className="rounded-sis border border-sis-border bg-sis-info-bg p-4">
            <p className="font-semibold">
              This academic-support follow-up is complete.
            </p>
            <p className="mt-1 text-sm">
              {supportClosureReason(item.closure.reason)} · Closed{" "}
              {formatLusaka(item.closure.closedAt)}. You can request further
              support at any time.
            </p>
          </div>
        ) : null}
      </section>
      <section aria-labelledby="follow-up-title" className="grid gap-3">
        <h2 id="follow-up-title" className="text-xl font-semibold">
          Academic follow-up
        </h2>
        {item.actions.length === 0 ? (
          <p className="text-sm text-sis-muted">
            No follow-up action has been proposed. You can continue the secure
            conversation with your adviser.
          </p>
        ) : (
          <div className="grid gap-3">
            {item.actions.map((action) => (
              <AcademicActionCard
                key={action.id}
                action={action}
                requestId={item.id}
                role="STUDENT"
              />
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="messages-title" className="grid gap-4">
        <h2 id="messages-title" className="text-xl font-semibold">
          Secure replies
        </h2>
        {item.messages.length === 0 ? (
          <p className="text-sis-muted">
            No reply yet. Your request is in your adviser’s assigned queue.
          </p>
        ) : (
          <ol className="grid list-none gap-3">
            {item.messages.map((message) => (
              <li
                key={message.id}
                className="rounded-sis border border-sis-border bg-sis-surface p-4"
              >
                <p className="text-sm font-semibold">
                  {message.authorRole === "ADVISER" ? item.owner : "You"} ·{" "}
                  {formatLusaka(message.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      {!item.closure ? (
        <AcademicReplyForm
          path={`me/requests/${item.id}/replies`}
          recipient={item.owner}
        />
      ) : null}
    </>
  );
}
