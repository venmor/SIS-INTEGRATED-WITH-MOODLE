"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

async function postIntegration(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/integration${path}`, {
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
        "The integration service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

// Delivery pause control: pausing skips worker ticks without losing
// queued work; resuming continues where it stopped.
export function PauseForm() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function act(paused: boolean) {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await postIntegration("/delivery/pause", {
        paused,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(paused ? "Delivery paused." : "Delivery resumed.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The request did not complete.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {error ? (
        <ErrorSummary
          title="Delivery control did not change"
          errors={[{ fieldId: "pause", message: error }]}
        />
      ) : null}
      <p>
        <button
          type="button"
          disabled={pending}
          onClick={() => void act(true)}
        >
          Pause delivery
        </button>{" "}
        <button
          type="button"
          disabled={pending}
          onClick={() => void act(false)}
        >
          Resume delivery
        </button>
      </p>
    </>
  );
}
