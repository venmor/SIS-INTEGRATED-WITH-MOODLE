"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@sis/ui";

export function AcademicReplyForm({
  path,
  recipient,
}: {
  path: string;
  recipient: string;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    key.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/support/${path}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({ body, idempotencyKey: key.current }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || !result.id)
        throw new Error(
          result.message ??
            "We could not confirm the reply. Keep your message and retry safely.",
        );
      key.current = null;
      setBody("");
      setNotice("Reply saved in the secure portal.");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "We could not confirm the reply. Retry safely.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-label={`Reply to ${recipient}`}
      onSubmit={send}
      className="grid max-w-2xl gap-3 border-t border-sis-border pt-5"
    >
      <h2 className="text-lg font-semibold">Reply to {recipient}</h2>
      {notice ? (
        <p
          role="status"
          className="text-sm font-semibold text-sis-brand-strong"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <ErrorSummary
          title="Reply not confirmed"
          errors={[{ fieldId: "support-reply", message: error }]}
        />
      ) : null}
      <label htmlFor="support-reply" className="text-sm font-semibold">
        Message
      </label>
      <textarea
        id="support-reply"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          key.current = null;
          setError("");
        }}
        maxLength={1000}
        rows={4}
        className="w-full rounded-sis border border-sis-border bg-sis-surface p-3 text-base text-sis-text"
      />
      <p className="text-sm text-sis-muted">
        Academic matters only. Do not include confidential counselling, health
        or safeguarding details.
      </p>
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="inline-flex min-h-11 w-fit items-center rounded-sis bg-sis-brand px-5 font-semibold text-white transition-colors hover:bg-sis-brand-strong disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? "Sending reply…" : "Send reply"}
      </button>
    </form>
  );
}
