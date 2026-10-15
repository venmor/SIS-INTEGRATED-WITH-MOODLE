"use client";
import staffUi from "../staff-workspace.module.css";

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

// Incident open/close: closure needs recovery evidence describing what
// proves resolution. Reconciliation linkage verifies in slice 6.
export function IncidentForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function act(
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
      await postIntegration(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "incident-title", message: failure(error) }]);
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
        <ErrorSummary title="The incident was not updated" errors={errors} />
      ) : null}
      <section className={staffUi.panel}>
        <h2 className={staffUi.sectionHeading}>Open incident</h2>
        <form
          className={staffUi.form}
          aria-label="Open integration incident"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void act(
              "/incidents",
              {
                title: String(data.get("incident-title") ?? ""),
                severity: String(data.get("incident-severity") ?? ""),
                detail: String(data.get("incident-detail") ?? "") || undefined,
              },
              "Incident opened and owned.",
              e.currentTarget,
            );
          }}
        >
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="incident-title">
              Title
            </label>{" "}
            <input
              className={staffUi.control}
              id="incident-title"
              name="incident-title"
              type="text"
              maxLength={200}
              required
            />
          </p>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="incident-severity">
              Severity
            </label>{" "}
            <select
              className={staffUi.control}
              id="incident-severity"
              name="incident-severity"
              required
            >
              <option value="">Choose…</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </p>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="incident-detail">
              Detail (optional)
            </label>{" "}
            <textarea
              className={staffUi.control}
              id="incident-detail"
              name="incident-detail"
              rows={2}
              maxLength={4000}
            />
          </p>
          <p>
            <button
              className={staffUi.button}
              type="submit"
              disabled={pending !== null}
            >
              {pending ? "Opening…" : "Open incident"}
            </button>
          </p>
        </form>
      </section>
      <section className={staffUi.panel}>
        <h2 className={staffUi.sectionHeading}>Close incident</h2>
        <form
          className={staffUi.form}
          aria-label="Close integration incident"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            void act(
              `/incidents/${String(data.get("close-id") ?? "")}/close`,
              { evidence: String(data.get("close-evidence") ?? "") },
              "Incident closed with recovery evidence.",
              e.currentTarget,
            );
          }}
        >
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="close-id">
              Incident ID
            </label>{" "}
            <input
              className={staffUi.control}
              id="close-id"
              name="close-id"
              type="text"
              required
            />
          </p>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="close-evidence">
              Recovery evidence
            </label>{" "}
            <textarea
              className={staffUi.control}
              id="close-evidence"
              name="close-evidence"
              rows={3}
              maxLength={4000}
              required
            />
          </p>
          <p>
            <button
              className={staffUi.button}
              type="submit"
              disabled={pending !== null}
            >
              {pending ? "Closing…" : "Close incident"}
            </button>
          </p>
        </form>
      </section>
    </>
  );
}
