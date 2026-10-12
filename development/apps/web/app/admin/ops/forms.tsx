"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";
import type { OpsIncidentView } from "@sis/contracts";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postOps(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/ops${path}`, {
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
        "The operations service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as {
      detail?: { supportReference?: string; code?: string };
    }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Manual incident open (TASK-PH8-003): title + severity behind no
// declaration — authority comes from the operator workspace, and the
// server refuses short titles and unknown severities. Every submit
// carries a fresh idempotency key.
export function OpenIncidentForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The incident was not opened" errors={errors} />
      ) : null}
      <form
        aria-label="Open operations incident"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          postOps("/incidents", {
            title: String(data.get("incident-title") ?? ""),
            severity: String(data.get("incident-severity") ?? ""),
            sourceRef: `manual-${crypto.randomUUID()}`,
            idempotencyKey: crypto.randomUUID(),
          })
            .then(() => {
              setNotice(
                "Incident opened. Acknowledge it to take ownership with a target response time.",
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                { fieldId: "incident-title", message: failure(error) },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <label htmlFor="incident-title">Title</label>{" "}
          <input
            id="incident-title"
            name="incident-title"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <label htmlFor="incident-severity">Severity</label>{" "}
          <select id="incident-severity" name="incident-severity">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Opening…" : "Open incident"}
          </button>
        </p>
      </form>
    </>
  );
}

// Incident transition form (TASK-PH8-003): acknowledge takes ownership,
// resolve demands root cause + recovery evidence (20+ chars), close
// seals a resolved incident. Version-checked and idempotent: concurrent
// transitions conflict instead of silently overwriting.
export function TransitionIncidentForm({ item }: { item: OpsIncidentView }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (item.status === "CLOSED") {
    return (
      <Notice
        severity="info"
        title="Incident closed"
        message="Closed incidents keep their outcome. Open a new incident for follow-up work."
      />
    );
  }
  const action =
    item.status === "OPEN"
      ? "acknowledge"
      : item.status === "ACKNOWLEDGED"
        ? "resolve"
        : "close";

  return (
    <>
      {notice ? <p role="status">{notice}</p> : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The incident was not updated" errors={errors} />
      ) : null}
      <form
        aria-label={`Move incident to ${action}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          const body: Record<string, unknown> = {
            version: item.version,
            idempotencyKey: crypto.randomUUID(),
          };
          if (action === "resolve") {
            body.rootCause = String(data.get("incident-root-cause") ?? "");
            body.recoveryEvidence = String(
              data.get("incident-recovery-evidence") ?? "",
            );
            body.preventiveAction =
              String(data.get("incident-preventive-action") ?? "") || undefined;
          }
          postOps(`/incidents/${item.id}/${action}`, body)
            .then(() => {
              setNotice(
                action === "acknowledge"
                  ? "Incident acknowledged. You own it to its target response time."
                  : action === "resolve"
                    ? "Incident resolved with recovery evidence."
                    : "Incident closed.",
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                {
                  fieldId: `incident-evidence-${item.id}`,
                  message: failure(error),
                },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        {action === "resolve" ? (
          <>
            <p>
              <label htmlFor={`incident-root-cause-${item.id}`}>
                Root cause
              </label>{" "}
              <input
                id={`incident-root-cause-${item.id}`}
                name="incident-root-cause"
                type="text"
                autoComplete="off"
              />
            </p>
            <p>
              <label htmlFor={`incident-evidence-${item.id}`}>
                Recovery evidence (20+ characters)
              </label>{" "}
              <input
                id={`incident-evidence-${item.id}`}
                name="incident-recovery-evidence"
                type="text"
                autoComplete="off"
              />
            </p>
            <p>
              <label htmlFor={`incident-preventive-${item.id}`}>
                Preventive action (optional)
              </label>{" "}
              <input
                id={`incident-preventive-${item.id}`}
                name="incident-preventive-action"
                type="text"
                autoComplete="off"
              />
            </p>
          </>
        ) : null}
        <p>
          <button type="submit" disabled={pending}>
            {pending
              ? "Recording…"
              : action === "acknowledge"
                ? "Acknowledge incident"
                : action === "resolve"
                  ? "Resolve incident"
                  : "Close incident"}
          </button>
        </p>
      </form>
    </>
  );
}
