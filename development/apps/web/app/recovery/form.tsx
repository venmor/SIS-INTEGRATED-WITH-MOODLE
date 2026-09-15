"use client";

import { useState } from "react";
import { ActionButton, ErrorSummary, Field, Notice } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "../page.module.css";

export function RecoveryForm() {
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
      const res = await fetch("/api/auth/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({ username: data.get("username") }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setDone(body.message ?? AUTH_MESSAGES.recoveryRequested.text);
      } else {
        setErrors([{ fieldId: "username", message: body.message ?? AUTH_MESSAGES.rateLimited.text }]);
      }
    } catch {
      setErrors([
        {
          fieldId: "username",
          message: "We could not confirm whether your request was received. Check your connection — your entry is kept — then try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <Notice severity="info" title="Recovery requested" message={done} />;
  }
  return (
    <form onSubmit={onSubmit}>
      {errors.length > 0 ? <ErrorSummary title="We could not take your request." errors={errors} /> : null}
      <Field
        id="username"
        label="Username"
        help="Enter the username from your account letter."
        autoComplete="username"
        error={errors.find((e) => e.fieldId === "username")?.message}
        inputProps={{ type: "text", required: true, maxLength: 64 }}
      />
      <div className={styles.actions}>
        <ActionButton kind="primary" pending={pending} loadingText="Sending request…">
          Send recovery request
        </ActionButton>
      </div>
      <p className={styles.supporting}>
        If signing in is urgent, contact the service desk with your username and full name.
      </p>
    </form>
  );
}
