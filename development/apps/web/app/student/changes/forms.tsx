"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postRegistration(
  path: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(`/api/registration${path}`, {
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
        "The registration service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

export function ChangeForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function submit(
    path: string,
    body: Record<string, unknown>,
    done: string,
    form: HTMLFormElement,
  ) {
    if (pending) return;
    setPending(path);
    setErrors([]);
    setNotice(null);
    try {
      await postRegistration(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      form.reset();
      // History and waitlist below are server-rendered; refresh so the new
      // request appears without a manual reload.
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "course-change", message: errorText(error) }]);
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
        <ErrorSummary title="The change was not recorded" errors={errors} />
      ) : null}
      <h2>Request an addition</h2>
      <form
        aria-label="Request a course addition"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void submit(
            "/changes",
            {
              kind: "ADD",
              courseCode: String(data.get("add-code") ?? ""),
              reason: String(data.get("add-reason") ?? ""),
              evidenceNote: String(data.get("add-evidence") ?? "") || undefined,
            },
            "Addition requested. It takes effect only after approval.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="add-code">Course code</label>{" "}
          <input
            id="add-code"
            name="add-code"
            type="text"
            maxLength={16}
            required
          />
        </p>
        <p>
          <label htmlFor="add-reason">Reason</label>{" "}
          <textarea
            id="add-reason"
            name="add-reason"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <label htmlFor="add-evidence">Evidence reference (optional)</label>{" "}
          <input
            id="add-evidence"
            name="add-evidence"
            type="text"
            maxLength={500}
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Working…" : "Request addition"}
          </button>
        </p>
      </form>
      <h2>Request a drop</h2>
      <form
        aria-label="Request a course drop"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void submit(
            "/changes",
            {
              kind: "DROP",
              courseCode: String(data.get("drop-code") ?? ""),
              reason: String(data.get("drop-reason") ?? ""),
            },
            "Drop requested. It takes effect only after approval.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="drop-code">Course code</label>{" "}
          <input
            id="drop-code"
            name="drop-code"
            type="text"
            maxLength={16}
            required
          />
        </p>
        <p>
          <label htmlFor="drop-reason">Reason</label>{" "}
          <textarea
            id="drop-reason"
            name="drop-reason"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Working…" : "Request drop"}
          </button>
        </p>
      </form>
      <h2>Join a waitlist</h2>
      <form
        aria-label="Join a course waitlist"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void submit(
            "/waitlist",
            { courseCode: String(data.get("waitlist-code") ?? "") },
            "Waitlist place requested.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="waitlist-code">Course code</label>{" "}
          <input
            id="waitlist-code"
            name="waitlist-code"
            type="text"
            maxLength={16}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Working…" : "Join waitlist"}
          </button>
        </p>
      </form>
    </>
  );
}
