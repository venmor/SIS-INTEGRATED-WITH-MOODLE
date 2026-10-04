"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary } from "@sis/ui";

export function AcademicRequestForm({ receiver }: { receiver: string }) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [category, setCategory] = useState("ACADEMIC_ADVISING");
  const [details, setDetails] = useState("");
  const [noDetails, setNoDetails] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    key.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/support/me/requests", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          category,
          contactMethod: "PORTAL",
          details: noDetails ? undefined : details.trim() || undefined,
          acknowledged,
          idempotencyKey: key.current,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || !body.id)
        throw new Error(
          body.message ??
            "We could not confirm that your request was received. Retry safely using the same form.",
        );
      router.push(`/student/support/${body.id}`);
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "We could not confirm the request. Retry safely using the same form.",
      );
    } finally {
      setPending(false);
    }
  }

  function changed() {
    key.current = null;
    setError("");
  }

  return (
    <form
      aria-label="Request academic support"
      onSubmit={submit}
      className="grid max-w-2xl gap-4 border-t border-sis-border pt-5"
    >
      <div>
        <h3 className="text-lg font-semibold">Request academic help</h3>
        <p className="mt-1 text-sm leading-6 text-sis-muted">
          Tell {receiver} what kind of academic help you need. You may ask to be
          contacted without adding details.
        </p>
      </div>
      {error ? (
        <ErrorSummary
          title="Request not confirmed"
          errors={[{ fieldId: "support-request", message: error }]}
        />
      ) : null}
      <label
        className="grid gap-2 text-sm font-semibold"
        htmlFor="support-category"
      >
        Support category
        <select
          id="support-category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            changed();
          }}
          className="min-h-11 rounded-sis border border-sis-border bg-sis-surface px-3 text-base font-normal text-sis-text"
        >
          <option value="ACADEMIC_ADVISING">Academic advising</option>
          <option value="COURSE_DIFFICULTY">
            Course or assessment difficulty
          </option>
        </select>
      </label>
      <label
        className="flex items-start gap-3 text-sm"
        htmlFor="support-no-details"
      >
        <input
          id="support-no-details"
          type="checkbox"
          checked={noDetails}
          onChange={(event) => {
            setNoDetails(event.target.checked);
            changed();
          }}
          className="mt-1 size-4"
        />
        <span>I prefer not to provide details now</span>
      </label>
      {!noDetails ? (
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="support-details"
        >
          Brief explanation (optional)
          <textarea
            id="support-details"
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
              changed();
            }}
            maxLength={500}
            rows={4}
            className="w-full rounded-sis border border-sis-border bg-sis-surface p-3 text-base font-normal text-sis-text"
          />
          <span className="text-xs font-normal text-sis-muted">
            Do not include urgent safety concerns, counselling or health
            information here.
          </span>
        </label>
      ) : null}
      <p className="text-sm">
        Contact method: <strong>Secure portal</strong>. You can read and answer
        your adviser’s reply here.
      </p>
      <label
        className="flex items-start gap-3 text-sm leading-6"
        htmlFor="support-acknowledge"
      >
        <input
          id="support-acknowledge"
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => {
            setAcknowledged(event.target.checked);
            changed();
          }}
          className="mt-1 size-4"
        />
        <span>
          I understand this academic request goes to {receiver} and is not an
          emergency or counselling service.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending || !acknowledged}
        className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-sis bg-sis-brand px-5 font-semibold text-white shadow-sis transition-colors duration-150 hover:bg-sis-brand-strong disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
          />
        ) : null}
        {pending ? "Sending request…" : "Send academic request"}
      </button>
      {!acknowledged ? (
        <p className="text-sm text-sis-muted">
          Read and accept the routing notice to send.
        </p>
      ) : null}
    </form>
  );
}
