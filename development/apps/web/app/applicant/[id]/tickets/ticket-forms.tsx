"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@sis/ui";
import { ErrorSummary } from "@sis/ui";
import { Field } from "@sis/ui";
import { Notice } from "@sis/ui";
import {
  applicantRequest,
  errorMessage,
} from "../../api";

interface FieldError {
  fieldId: string;
  message: string;
}

function useTicketPost(path: string, version: number) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const key = useRef<string | null>(null);

  async function submit(body: Record<string, string>) {
    if (pending) return false;
    setPending(true);
    setErrors([]);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      await applicantRequest(path, {
        ...body,
        version,
        idempotencyKey: key.current,
      });
      key.current = null;
      setDone(true);
      return true;
    } catch (error) {
      setErrors([{ fieldId: "subject", message: errorMessage(error) }]);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { errors, pending, done, submit };
}

export function TicketForm({
  applicationId,
  version,
}: {
  applicationId: string;
  version: number;
}) {
  const { errors, pending, done, submit } = useTicketPost(
    `/${applicationId}/tickets`,
    version,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await submit({
      subject: String(data.get("subject") ?? ""),
      message: String(data.get("message") ?? ""),
    });
    if (ok) (event.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={onSubmit} aria-label="Open a support ticket">
      <h2>Open a ticket</h2>
      {done ? (
        <Notice
          severity="success"
          title="Ticket opened"
          message="The office will reply here. Keep this application reference for anything you send."
        />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The ticket was not opened" errors={errors} />
      ) : null}
      <Field
        id="ticket-subject"
        label="Subject"
        inputProps={{ name: "subject", maxLength: 120 }}
      />
      <Field
        id="ticket-message"
        label="Message"
        help="Do not include identity numbers unless the office asks for them here."
        inputProps={{ name: "message", maxLength: 2000 }}
      />
      <p>
        <ActionButton type="submit" pending={pending} loadingText="Opening…">
          Open ticket
        </ActionButton>
      </p>
    </form>
  );
}

export function ReplyForm({
  applicationId,
  ticketId,
  version,
}: {
  applicationId: string;
  ticketId: string;
  version: number;
}) {
  const { errors, pending, done, submit } = useTicketPost(
    `/${applicationId}/tickets/${ticketId}/replies`,
    version,
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await submit({
      message: String(data.get("message") ?? ""),
    });
    if (ok) (event.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={onSubmit} aria-label="Reply to support ticket">
      {done ? (
        <Notice severity="success" title="Reply sent" message="Sent." />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The reply was not sent" errors={errors} />
      ) : null}
      <Field
        id={`reply-${ticketId}`}
        label="Reply"
        inputProps={{ name: "message", maxLength: 2000 }}
      />
      <p>
        <ActionButton type="submit" pending={pending} loadingText="Sending…">
          Send reply
        </ActionButton>
      </p>
    </form>
  );
}
