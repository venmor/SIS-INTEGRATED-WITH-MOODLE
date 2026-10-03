"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationRecordView } from "@sis/contracts";
import { ErrorSummary, Notice } from "@sis/ui";
import styles from "../student/student.module.css";

async function postNotification(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/notifications${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { message?: string }).message ??
        "The notification service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

// Per-notice read + suppression actions (TASK-PH8-001). Reads mark
// every channel READ; suppression applies to optional notices only —
// mandatory refusals surface the server reason without leaking policy.
export function NotificationActions({ item }: { item: NotificationRecordView }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(path: string, body: object) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await postNotification(path, body);
      router.refresh();
    } catch (unknown) {
      setError(
        unknown instanceof Error ? unknown.message : "Request failed. Try again shortly.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error ? (
        <ErrorSummary title="The notice was not updated" errors={[{ fieldId: `notice-${item.id}`, message: error }]} />
      ) : null}
      {item.mandatory ? (
        <Notice
          severity="info"
          title="Mandatory notice"
          message="This notice cannot be disabled."
        />
      ) : null}
      <p className={styles.meta} id={`notice-${item.id}`}>
        {item.event} · {item.category}
        {item.mandatory ? " · mandatory" : " · optional"}
      </p>
      <p>
        {item.state !== "READ" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void run(`/records/${item.id}/read`, {
                idempotencyKey: crypto.randomUUID(),
              })
            }
          >
            Mark as read
          </button>
        ) : null}{" "}
        {item.mandatory ? null : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void run(`/records/${item.id}/suppress`, {
                idempotencyKey: crypto.randomUUID(),
                optedOut: true,
              })
            }
          >
            Mute these notices
          </button>
        )}
      </p>
    </>
  );
}
