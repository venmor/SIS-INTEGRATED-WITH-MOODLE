"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postStudent(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/records${path}`, {
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
        "The student service could not complete this request.",
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

export function ContactForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      await postStudent("/me/contact", {
        email: String(data.get("email") ?? "").trim() || undefined,
        phone: String(data.get("phone") ?? "").trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice("Contact details saved. Changed channels need verification again.");
      router.refresh();
      form.reset();
    } catch (error) {
      setErrors([{ fieldId: "student-contact", message: errorText(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The update did not complete" errors={errors} />
      ) : null}
      <form
        aria-label="Update contact details"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="student-email">Email address</label>{" "}
          <input id="student-email" name="email" type="email" maxLength={120} />
        </p>
        <p>
          <label htmlFor="student-phone">Mobile number</label>{" "}
          <input id="student-phone" name="phone" type="tel" maxLength={32} />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Working…" : "Save contact details"}
          </button>
        </p>
      </form>
    </>
  );
}

export function CorrectionForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      await postStudent("/me/corrections", {
        field: String(data.get("field") ?? ""),
        requestedValue: String(data.get("requestedValue") ?? ""),
        reason: String(data.get("reason") ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice("Correction requested. The record stays unchanged until approval.");
      router.refresh();
      form.reset();
    } catch (error) {
      setErrors([{ fieldId: "student-correction", message: errorText(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The request did not complete" errors={errors} />
      ) : null}
      <form
        aria-label="Request a record correction"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="correction-field">Field</label>{" "}
          <select id="correction-field" name="field" defaultValue="displayName">
            <option value="displayName">Official name</option>
            <option value="email">Email address</option>
            <option value="phone">Mobile number</option>
          </select>
        </p>
        <p>
          <label htmlFor="correction-value">Requested value</label>{" "}
          <input
            id="correction-value"
            name="requestedValue"
            type="text"
            maxLength={200}
            required
          />
        </p>
        <p>
          <label htmlFor="correction-reason">Reason</label>{" "}
          <textarea
            id="correction-reason"
            name="reason"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Working…" : "Request correction"}
          </button>
        </p>
      </form>
    </>
  );
}
