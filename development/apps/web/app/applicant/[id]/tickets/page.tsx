import type { SupportTicketView } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationCaseNav, ApplicationUnavailable } from "../../chrome";
import { formatLusaka } from "../../../../lib/time";
import { Notice } from "@sis/ui";
import { TicketForm, ReplyForm } from "./ticket-forms";
import styles from "../../applicant.module.css";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<{ items: SupportTicketView[] }>(
    `/${id}/tickets`,
    `/applicant/${id}/tickets`,
  );
  if (!r.data) return <ApplicationUnavailable message={r.message} />;
  const timeline = await loadApplicant<{ version: number }>(
    `/${id}/timeline`,
    `/applicant/${id}/tickets`,
  );
  const version = timeline.data?.version ?? 1;
  return (
    <>
      <p className={styles.eyebrow}>Submitted application</p>
      <h1>Support tickets</h1>
      <p className={styles.lede}>
        Tickets stay connected to this application. Replies from the office
        appear here.
      </p>
      <TicketForm applicationId={id} version={version} />
      {r.data.items.length === 0 ? (
        <Notice
          severity="info"
          title="No tickets"
          message="No support tickets for this application yet."
        />
      ) : (
        <ol>
          {r.data.items.map((ticket) => (
            <li key={ticket.id} className={styles.card}>
              <p>
                <strong>{ticket.subject}</strong> — {ticket.status}
              </p>
              <p className={styles.muted}>
                Opened {formatLusaka(ticket.createdAt)}
              </p>
              <ul>
                {ticket.messages.map((message) => (
                  <li key={message.id}>
                    <p>
                      <strong>
                        {message.authorRole === "APPLICANT"
                          ? "You"
                          : message.authorRole}
                      </strong>{" "}
                      <span className={styles.muted}>
                        {formatLusaka(message.createdAt)}
                      </span>
                    </p>
                    <p>{message.body}</p>
                  </li>
                ))}
              </ul>
              {ticket.status === "RESOLVED" ? (
                <p className={styles.muted}>
                  Resolved. Open a new ticket for anything further.
                </p>
              ) : (
                <ReplyForm
                  applicationId={id}
                  ticketId={ticket.id}
                  version={version}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
