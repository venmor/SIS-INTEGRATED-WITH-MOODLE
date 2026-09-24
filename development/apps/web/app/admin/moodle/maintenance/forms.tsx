"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

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

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Maintenance scheduling through approved change: deliveries inside an
// active window defer to the window end. Windows cancel, never edit.
export function MaintenanceForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function act(
    path: string,
    body: Record<string, unknown>,
    done: string,
    form?: HTMLFormElement | null,
  ) {
    if (pending) return;
    setPending(path);
    setErrors([]);
    setNotice(null);
    try {
      await postIntegration(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      form?.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "maint-reason", message: failure(error) }]);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The window was not updated" errors={errors} />
      ) : null}
      <h2>Schedule maintenance</h2>
      <form
        aria-label="Schedule Moodle maintenance"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            "/maintenance",
            {
              reason: String(data.get("maint-reason") ?? ""),
              startsAt: new Date(String(data.get("maint-start") ?? "")).toISOString(),
              endsAt: new Date(String(data.get("maint-end") ?? "")).toISOString(),
            },
            "Maintenance scheduled. Deliveries inside the window defer to its end.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="maint-reason">Reason</label>{" "}
          <input id="maint-reason" name="maint-reason" type="text" maxLength={2000} required />
        </p>
        <p>
          <label htmlFor="maint-start">Starts at</label>{" "}
          <input id="maint-start" name="maint-start" type="datetime-local" required />
        </p>
        <p>
          <label htmlFor="maint-end">Ends at</label>{" "}
          <input id="maint-end" name="maint-end" type="datetime-local" required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Scheduling…" : "Schedule maintenance"}
          </button>
        </p>
      </form>
      <h2>Cancel a window</h2>
      <form
        aria-label="Cancel maintenance window"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            `/maintenance/${String(data.get("maint-id") ?? "")}/cancel`,
            {},
            "Window cancelled.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="maint-id">Window ID</label>{" "}
          <input id="maint-id" name="maint-id" type="text" required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Cancelling…" : "Cancel window"}
          </button>
        </p>
      </form>
    </>
  );
}
