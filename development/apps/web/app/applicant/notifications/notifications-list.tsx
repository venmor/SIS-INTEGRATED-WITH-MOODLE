"use client";

import { useState } from "react";
import { ActionButton } from "@sis/ui";
import { Notice } from "@sis/ui";
import type { ApplicantNotification } from "@sis/contracts";
import {
  applicantRequest,
  errorMessage,
} from "../api";

// Pollable inbox projection (no delivery provider in this slice). Mandatory
// decision/deadline notices cannot be disabled; there is no preference UI
// here by design — preferences arrive with the delivery worker.
export function NotificationsList({
  initial,
}: {
  initial: ApplicantNotification[];
}) {
  const [items, setItems] =
    useState<ApplicantNotification[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function markRead(id: string) {
    if (pending) return;
    setPending(id);
    setError(null);
    try {
      await applicantRequest(`/notifications/${id}/read`, {});
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (unknownError) {
      setError(errorMessage(unknownError));
    } finally {
      setPending(null);
    }
  }

  if (items.length === 0) {
    return (
      <Notice
        severity="info"
        title="No notifications"
        message="Decisions, requests and deadline reminders will appear here."
      />
    );
  }

  return (
    <>
      {error ? (
        <Notice severity="error" title="Not marked as read" message={error} />
      ) : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <p>
              <strong>{item.title}</strong>{" "}
              {item.readAt ? "(read)" : "(unread)"}
            </p>
            {item.readAt ? null : (
              <p>
                <ActionButton
                  kind="secondary"
                  type="button"
                  pending={pending === item.id}
                  loadingText="Marking as read…"
                  disabled={pending !== null}
                  aria-label={`Mark notification as read: ${item.title}`}
                  onClick={() => void markRead(item.id)}
                >
                  Mark as read
                </ActionButton>
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
