"use client";

import { useState } from "react";
import { ActionButton, ErrorSummary, Field, Notice } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "../../page.module.css";

// ACT-IAM-001 grant form (§12.9 fields). Exact-username lookup only — no
// browsing. Double-submit blocked; failures summarized with a support
// reference when the API supplies one.
export function GrantForm() {
  const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors([]);
    try {
      const data = new FormData(event.currentTarget);
      const pick = (name: string): string | undefined => {
        const value = String(data.get(name) ?? "").trim();
        return value === "" ? undefined : value;
      };
      const res = await fetch("/api/auth/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: pick("username"),
          role: pick("role"),
          scopeType: pick("scopeType"),
          scopeRef: pick("scopeRef"),
          startsAt: pick("startsAt"),
          endsAt: pick("endsAt"),
          appointmentRef: pick("appointmentRef"),
          authoritySource: pick("authoritySource"),
          capabilities: pick("capabilities")?.split(",").map((c) => c.trim()).filter(Boolean),
          employmentType: pick("employmentType"),
          reason: pick("reason"),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; reference?: string };
      const ref = body.reference ? ` (Reference: ${body.reference})` : "";
      if (res.ok) {
        setDone(body.message ?? AUTH_MESSAGES.grantCreated.text);
      } else {
        setErrors([{ fieldId: "username", message: `${body.message ?? AUTH_MESSAGES.grantDenied.text}${ref}` }]);
      }
    } catch {
      setErrors([
        {
          fieldId: "username",
          message: "We could not confirm whether your request was received. Check your connection — your entries are kept — then try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <Notice severity="success" title="Role assignment created" message={done} action={{ label: "Back home", href: "/" }} />;
  }
  return (
    <form onSubmit={onSubmit}>
      {errors.length > 0 ? <ErrorSummary title="We could not create the assignment." errors={errors} /> : null}
      <Field id="username" label="Username" help="Exact account username — there is no browsing." autoComplete="username" inputProps={{ type: "text", required: true, maxLength: 64 }} />
      <Field id="role" label="Role" help="Assignment role code, for example TUT." inputProps={{ type: "text", required: true, maxLength: 32 }} />
      <Field id="scopeType" label="Scope type" help="Organizational scope type, for example OFFERING." inputProps={{ type: "text", required: true, maxLength: 32 }} />
      <Field id="scopeRef" label="Scope reference" help="Scope reference, for example SWE101-2026S1." inputProps={{ type: "text", required: true, maxLength: 128 }} />
      <Field id="startsAt" label="Effective start" help="First day the assignment may be used." inputProps={{ type: "date", required: true }} />
      <Field id="endsAt" label="Effective end" help="Leave empty for no end date." inputProps={{ type: "date", required: false }} />
      <Field id="appointmentRef" label="Appointment reference" help="Evidence reference — required, never optional." inputProps={{ type: "text", required: true, maxLength: 128 }} />
      <Field id="authoritySource" label="Authority source" help="Who authorizes this assignment." inputProps={{ type: "text", required: true, maxLength: 128 }} />
      <Field id="capabilities" label="Capabilities" help="Comma-separated approved capabilities." inputProps={{ type: "text", required: false, maxLength: 512 }} />
      <Field id="employmentType" label="Employment type" help="For example PERMANENT or ACTING." inputProps={{ type: "text", required: false, maxLength: 32 }} />
      <Field id="reason" label="Reason" help="Why this assignment exists." inputProps={{ type: "text", required: true, maxLength: 512 }} />
      <div className={styles.actions}>
        <ActionButton kind="primary" pending={pending} loadingText="Creating assignment…">
          Create assignment
        </ActionButton>
      </div>
    </form>
  );
}
