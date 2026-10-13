"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatLusakaDate } from "../../../lib/time";
import type { AcademicSupportAction } from "../../../lib/support";
import { supportActionStatus } from "../../../lib/support-status";

export function AcademicActionCard({
  action,
  requestId,
  role,
}: {
  action: AcademicSupportAction;
  requestId: string;
  role: "STUDENT" | "ADVISER";
}) {
  const router = useRouter();
  const keys = useRef<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const overdue =
    action.dueOn <
      new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Lusaka" }) &&
    !["DECLINED", "COMPLETE"].includes(action.status);

  async function change(event: "accept" | "decline" | "claim" | "confirm") {
    if (pending) return;
    keys.current[event] ??= crypto.randomUUID();
    setPending(event);
    setError("");
    setNotice("");
    const base =
      role === "STUDENT" ? `me/requests/${requestId}` : `assigned/${requestId}`;
    const endpoint =
      event === "accept" || event === "decline"
        ? `${base}/actions/${action.id}/response`
        : `${base}/actions/${action.id}/${event}`;
    try {
      const response = await fetch(`/api/support/${endpoint}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          idempotencyKey: keys.current[event],
          ...(event === "accept" || event === "decline"
            ? { accept: event === "accept" }
            : {}),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!response.ok || result.id !== action.id)
        throw new Error(
          result.message ??
            "Follow-up was not confirmed. Check its current state and retry.",
        );
      delete keys.current[event];
      setNotice(
        event === "accept"
          ? "Follow-up agreed."
          : event === "decline"
            ? "You declined this optional action."
            : event === "claim"
              ? "Completion sent to your adviser for confirmation."
              : "Completion confirmed.",
      );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Follow-up was not confirmed. Retry safely.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="grid gap-3 rounded-sis border border-sis-border bg-sis-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{action.title}</h3>
        <span className="rounded-full border border-sis-border px-3 py-1 text-xs font-semibold">
          {supportActionStatus(action.status)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{action.explanation}</p>
      <p className="text-sm text-sis-muted">
        Owner: {role === "STUDENT" ? "You" : "Student"} · Due{" "}
        {formatLusakaDate(action.dueOn)}
        {overdue ? " · Due date passed" : ""}
      </p>
      {role === "STUDENT" && action.href?.startsWith("/student/") ? (
        <Link
          href={action.href}
          className="text-sm font-semibold text-sis-brand-strong underline underline-offset-2"
        >
          Open task
        </Link>
      ) : null}
      {role === "STUDENT" && action.status === "PROPOSED" ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={Boolean(pending)}
            onClick={() => void change("accept")}
            className="min-h-11 rounded-sis bg-sis-brand px-4 font-semibold text-white disabled:opacity-60"
          >
            {pending === "accept" ? "Saving…" : "Agree to follow-up"}
          </button>
          <button
            type="button"
            disabled={Boolean(pending)}
            onClick={() => void change("decline")}
            className="min-h-11 rounded-sis border border-sis-border px-4 font-semibold disabled:opacity-60"
          >
            {pending === "decline" ? "Saving…" : "Decline optional action"}
          </button>
        </div>
      ) : null}
      {role === "STUDENT" && action.status === "ACCEPTED" ? (
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => void change("claim")}
          className="min-h-11 w-fit rounded-sis border border-sis-border px-4 font-semibold disabled:opacity-60"
        >
          {pending === "claim" ? "Sending…" : "I completed this"}
        </button>
      ) : null}
      {role === "ADVISER" && action.status === "CLAIMED_COMPLETE" ? (
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => void change("confirm")}
          className="min-h-11 w-fit rounded-sis bg-sis-brand px-4 font-semibold text-white disabled:opacity-60"
        >
          {pending === "confirm" ? "Confirming…" : "Confirm completion"}
        </button>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="text-sm font-semibold text-sis-brand-strong"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-sis-attention-text">
          {error}
        </p>
      ) : null}
    </article>
  );
}
