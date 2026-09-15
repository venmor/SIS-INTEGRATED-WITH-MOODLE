"use client";

import { useState } from "react";
import { ActionButton, ErrorSummary, Field, PasswordField } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "../page.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

// Sign-in form: uncontrolled inputs (values live in the DOM, preserved across
// failures), submit via fetch to the same-origin proxy. Double-submit blocked
// with announced progress (04/05); focus moves to the summary on failure.
// §16.1 support reference (§16.14 correlationId) is appended when the API
// supplies one; the AUTH-* sentence itself stays verbatim.
export function SignInForm() {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors([]);
    try {
      const data = new FormData(event.currentTarget);
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; reference?: string };
      const ref = body.reference ? ` (Reference: ${body.reference})` : '';
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      if (res.status === 429) {
        setErrors([{ fieldId: "username", message: `${body.message ?? AUTH_MESSAGES.rateLimited.text}${ref}` }]);
      } else {
        setErrors([{ fieldId: "password", message: `${body.message ?? AUTH_MESSAGES.signInFailure.text}${ref}` }]);
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

  return (
    <form onSubmit={onSubmit} noValidate={false}>
      {errors.length > 0 ? <ErrorSummary title="We could not sign you in." errors={errors} /> : null}
      <Field
        id="username"
        label="Username"
        help="The username from your account letter."
        autoComplete="username"
        error={errors.find((e) => e.fieldId === "username")?.message}
        inputProps={{ type: "text", required: true, maxLength: 64 }}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        error={errors.find((e) => e.fieldId === "password")?.message}
      />
      <div className={styles.actions}>
        <ActionButton kind="primary" pending={pending} loadingText="Signing in…">
          Sign in
        </ActionButton>
      </div>
      <p className={styles.supporting}>
        <a href="/recovery">Need help signing in?</a>
      </p>
    </form>
  );
}
