"use client";

import { useState } from "react";
import { ActionButton, DeniedPanel, ErrorSummary, Field, Notice } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "../../page.module.css";

interface ApiBody {
  message?: string;
  reference?: string;
  username?: string;
  displayName?: string;
}

interface Resolved {
  username: string;
  displayName: string;
}

// ACT-IAM-001 grant form (§12.9 fields) in two steps: resolve the person
// first (minimized, exact-username only — no browsing), then create.
// UI-SUBMIT-001: one idempotency key per form open, progress announcement,
// payload retained across failures, receipt re-checked before any retry
// after connection loss. 403s render the denial panel (UI-DENIED-001);
// validation failures keep the error summary (UI-ERROR-001).
export function GrantForm() {
  const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);
  const [denied, setDenied] = useState<{ message: string; reference?: string } | null>(null);
  const [resolvePending, setResolvePending] = useState(false);
  const [grantPending, setGrantPending] = useState(false);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function clearFeedback() {
    setErrors([]);
    setDenied(null);
    setEmptyNotice(null);
  }

  async function postJson(url: string, payload: unknown): Promise<{ status: number; body: ApiBody }> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as ApiBody;
    return { status: res.status, body };
  }

  async function onResolve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resolvePending) return;
    setResolvePending(true);
    clearFeedback();
    try {
      const data = new FormData(event.currentTarget);
      const username = String(data.get("username") ?? "").trim();
      const { status, body } = await postJson("/api/auth/grants/resolve", { username });
      const ref = body.reference ? ` (Reference: ${body.reference})` : "";
      if (status === 200 && body.username && body.displayName) {
        setResolved({ username: body.username, displayName: body.displayName });
      } else if (status === 404) {
        setEmptyNotice(`${body.message ?? AUTH_MESSAGES.scopedEmpty.text}${ref}`);
      } else if (status === 403) {
        setDenied({ message: body.message ?? AUTH_MESSAGES.grantDenied.text, reference: body.reference });
      } else {
        setErrors([{ fieldId: "username", message: `${body.message ?? AUTH_MESSAGES.grantDenied.text}${ref}` }]);
      }
    } catch {
      setErrors([
        {
          fieldId: "username",
          message: "We could not confirm whether your request was received. Check your connection — your entry is kept — then try again.",
        },
      ]);
    } finally {
      setResolvePending(false);
    }
  }

  async function onGrant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (grantPending || !resolved) return;
    setGrantPending(true);
    clearFeedback();
    const data = new FormData(event.currentTarget);
    const pick = (name: string): string | undefined => {
      const value = String(data.get(name) ?? "").trim();
      return value === "" ? undefined : value;
    };
    const payload = {
      username: resolved.username,
      role: pick("role"),
      scopeType: pick("scopeType"),
      scopeRef: pick("scopeRef"),
      startsAt: pick("startsAt"),
      endsAt: pick("endsAt"),
      appointmentRef: pick("appointmentRef"),
      authoritySource: pick("authoritySource"),
      capabilities: pick("capabilities")?.split(",").map((c) => c.trim()).filter(Boolean),
      employmentType: pick("employmentType"),
      approverId: pick("approverId"),
      reason: pick("reason"),
      idempotencyKey,
    };
    try {
      const { status, body } = await postJson("/api/auth/grants", payload);
      const ref = body.reference ? ` (Reference: ${body.reference})` : "";
      if (status === 201 || status === 200) {
        setDone(body.message ?? AUTH_MESSAGES.grantCreated.text);
      } else if (status === 403) {
        setDenied({ message: body.message ?? AUTH_MESSAGES.grantDenied.text, reference: body.reference });
      } else {
        setErrors([{ fieldId: "role", message: `${body.message ?? AUTH_MESSAGES.grantDenied.text}${ref}` }]);
      }
    } catch {
      // Connection lost mid-create: check the stored receipt by key before
      // any retry, so a blind resubmission can never double-create.
      try {
        const receipt = await fetch(`/api/auth/commands/${idempotencyKey}`, { credentials: "same-origin" });
        if (receipt.ok) {
          const found = (await receipt.json().catch(() => ({}))) as {
            response?: { message?: string };
          };
          setDone(found.response?.message ?? AUTH_MESSAGES.grantCreated.text);
          return;
        }
      } catch {
        // Receipt check failed too — fall through to the kept-payload error.
      }
      setErrors([
        {
          fieldId: "role",
          message: "We could not confirm whether your request was received. Do not submit again yet — check first, then retry with your entries kept.",
        },
      ]);
    } finally {
      setGrantPending(false);
    }
  }

  if (done) {
    return <Notice severity="success" title="Role assignment created" message={done} action={{ label: "Back home", href: "/" }} />;
  }

  if (!resolved) {
    return (
      <form onSubmit={onResolve}>
        {denied ? <DeniedPanel message={denied.message} reference={denied.reference} /> : null}
        {emptyNotice ? <Notice severity="info" title="No matching account" message={emptyNotice} /> : null}
        {errors.length > 0 ? <ErrorSummary title="We could not find the account." errors={errors} /> : null}
        <Field id="username" label="Username" help="Exact account username." autoComplete="username" inputProps={{ type: "text", required: true, maxLength: 64 }} />
        <div className={styles.actions}>
          <ActionButton kind="primary" pending={resolvePending} loadingText="Finding account…">
            Find account
          </ActionButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onGrant}>
      {denied ? <DeniedPanel message={denied.message} reference={denied.reference} /> : null}
      {errors.length > 0 ? <ErrorSummary title="We could not create the assignment." errors={errors} /> : null}
      <Notice
        severity="info"
        title={`Granting to ${resolved.displayName}`}
        message={`Account: ${resolved.username}. Confirm the person before continuing.`}
      />
      <Field id="role" label="Role" help="Assignment role code, for example TUT." inputProps={{ type: "text", required: true, maxLength: 32 }} />
      <Field id="scopeType" label="Scope type" help="Organizational scope type, for example OFFERING." inputProps={{ type: "text", required: true, maxLength: 32 }} />
      <Field id="scopeRef" label="Scope reference" help="Scope reference, for example SWE101-2026S1." inputProps={{ type: "text", required: true, maxLength: 128 }} />
      <Field id="startsAt" label="Effective start" help="First day the assignment may be used." inputProps={{ type: "date", required: true }} />
      <Field id="endsAt" label="Effective end" help="Leave empty for no end date." inputProps={{ type: "date", required: false }} />
      <Field id="appointmentRef" label="Appointment reference" help="Evidence reference for formal authorization." inputProps={{ type: "text", required: true, maxLength: 128 }} />
      <Field id="authoritySource" label="Authority source" help="Authorizing body or officer." inputProps={{ type: "text", required: true, maxLength: 128 }} />
      <Field id="capabilities" label="Capabilities" help="Comma-separated approved capabilities." inputProps={{ type: "text", required: false, maxLength: 512 }} />
      <Field id="employmentType" label="Employment type" help="For example PERMANENT or ACTING." inputProps={{ type: "text", required: false, maxLength: 32 }} />
      <Field id="approverId" label="Approver account ID" help="Authorizing approver account ID." inputProps={{ type: "text", required: true, maxLength: 36 }} />
      <Field id="reason" label="Reason" help="Why this assignment exists." inputProps={{ type: "text", required: true, maxLength: 512 }} />
      <div className={styles.actions}>
        <ActionButton kind="primary" pending={grantPending} loadingText="Creating assignment…">
          Create assignment
        </ActionButton>
        <ActionButton kind="secondary" type="button" pending={grantPending} onClick={() => setResolved(null)}>
          Use different person
        </ActionButton>
      </div>
    </form>
  );
}
