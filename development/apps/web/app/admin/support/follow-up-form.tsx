"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FollowUpProposalForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    key.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(
        `/api/support/assigned/${requestId}/actions`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            idempotencyKey: key.current,
            title: String(data.get("title") ?? ""),
            explanation: String(data.get("explanation") ?? ""),
            routeKey: String(data.get("routeKey") ?? ""),
            dueOn: String(data.get("dueOn") ?? ""),
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || !result.id)
        throw new Error(
          result.message ??
            "Follow-up was not confirmed. Check the case and retry safely.",
        );
      key.current = null;
      form.reset();
      setNotice(
        "Follow-up saved in the student portal. Delivery outside the portal is not enabled.",
      );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Follow-up was not confirmed. Retry safely.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-label="Propose academic follow-up"
      onSubmit={submit}
      className="grid gap-4 rounded-sis border border-sis-border bg-sis-surface p-5"
    >
      <h3 className="text-lg font-semibold">Propose a student action</h3>
      <label className="grid gap-2 text-sm font-semibold">
        Action title
        <input
          name="title"
          maxLength={120}
          required
          className="min-h-11 rounded-sis border border-sis-border p-3 text-base font-normal"
          onChange={() => {
            key.current = null;
          }}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        What the student should do
        <textarea
          name="explanation"
          maxLength={500}
          rows={3}
          required
          className="rounded-sis border border-sis-border p-3 text-base font-normal"
          onChange={() => {
            key.current = null;
          }}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Open in SIS
        <select
          name="routeKey"
          required
          defaultValue="COURSES"
          className="min-h-11 rounded-sis border border-sis-border bg-sis-surface p-3 text-base font-normal"
          onChange={() => {
            key.current = null;
          }}
        >
          <option value="COURSES">My courses</option>
          <option value="REGISTRATION">Registration</option>
          <option value="SUPPORT">Academic support</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Follow-up due date
        <input
          name="dueOn"
          type="date"
          required
          className="min-h-11 rounded-sis border border-sis-border p-3 text-base font-normal"
          onChange={() => {
            key.current = null;
          }}
        />
      </label>
      <p className="text-sm text-sis-muted">
        The student can agree or decline. This is an academic task, not a booked
        appointment or official-record change.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-sis-attention-text">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="text-sm font-semibold text-sis-brand-strong"
        >
          {notice}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-fit rounded-sis bg-sis-brand px-5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving follow-up…" : "Propose follow-up"}
      </button>
    </form>
  );
}
