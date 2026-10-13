"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CloseAcademicCaseForm({
  requestId,
  hasActiveAction,
}: {
  requestId: string;
  hasActiveAction: boolean;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || hasActiveAction) return;
    const form = event.currentTarget;
    const reason = String(new FormData(form).get("reason") ?? "");
    key.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/support/assigned/${requestId}/close`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({ idempotencyKey: key.current, reason }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
        message?: string;
      };
      if (!response.ok || !result.id || result.status !== "CLOSED")
        throw new Error(
          result.message ??
            "Closure was not confirmed. Check this case before retrying.",
        );
      key.current = null;
      setNotice(
        "Academic-support case completed. The student can see the outcome.",
      );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Closure was not confirmed. Check this case before retrying.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-label="Complete academic-support case"
      onSubmit={submit}
      className="grid gap-4 rounded-sis border border-sis-border bg-sis-surface p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">Complete this case</h2>
        <p className="mt-1 text-sm text-sis-muted">
          Choose the outcome supported by the conversation or a confirmed
          action. The student will see the reason and can start another request.
        </p>
      </div>
      {hasActiveAction ? (
        <p className="text-sm text-sis-attention-text">
          Finish the open student action before completing this case.
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold">
        Closure reason
        <select
          name="reason"
          required
          defaultValue=""
          disabled={hasActiveAction || pending}
          onChange={() => {
            key.current = null;
          }}
          className="min-h-11 rounded-sis border border-sis-border bg-sis-surface p-3 text-base font-normal"
        >
          <option value="" disabled>
            Choose an outcome
          </option>
          <option value="GUIDANCE_GIVEN">Academic guidance provided</option>
          <option value="COURSE_PLAN_RESOLVED">
            Course-plan issue resolved
          </option>
          <option value="AGREED_ACTION_COMPLETED">
            Agreed action completed
          </option>
        </select>
      </label>
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
        disabled={hasActiveAction || pending}
        className="min-h-11 w-fit rounded-sis bg-sis-brand px-5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Completing case…" : "Complete case"}
      </button>
    </form>
  );
}
