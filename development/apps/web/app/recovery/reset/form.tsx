"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionButton, ErrorSummary, Notice, PasswordField } from "@sis/ui";
import { AUTH_MESSAGES, SECURITY_V1 } from "@sis/config";
import styles from "../../page.module.css";

// New-password form. Policy guidance renders from SECURITY-v1 (never
// hardcoded). The token is read from the link query (?token=) and sent in the
// JSON body — it is never rendered into the page.
export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const first = String(data.get("new-password") ?? "");
    const second = String(data.get("confirm-password") ?? "");
    if (first !== second) {
      setErrors([{ fieldId: "confirm-password", message: "The passwords do not match." }]);
      return;
    }
    setPending(true);
    setErrors([]);
    try {
      const res = await fetch("/api/auth/recovery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({ token, newPassword: first }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setDone(body.message ?? AUTH_MESSAGES.passwordChanged.text);
      } else if (res.status === 400) {
        setErrors([
          {
            fieldId: "new-password",
            message: body.message ?? AUTH_MESSAGES.recoveryLinkExpired.text,
          },
        ]);
      } else {
        setErrors([{ fieldId: "new-password", message: body.message ?? AUTH_MESSAGES.rateLimited.text }]);
      }
    } catch {
      setErrors([
        {
          fieldId: "new-password",
          message: "We could not confirm whether your request was received. Check your connection, then try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <Notice
        severity="warning"
        title="Recovery link missing"
        message="Open this page through the recovery link you received, or request a fresh one."
        action={{ label: "Request a fresh link", href: "/recovery" }}
      />
    );
  }
  if (done) {
    return <Notice severity="success" title="Password changed" message={done} action={{ label: "Sign in", href: "/sign-in" }} />;
  }
  return (
    <form onSubmit={onSubmit}>
      {errors.length > 0 ? <ErrorSummary title="We need a correction before continuing." errors={errors} /> : null}
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        policyGuidance={SECURITY_V1.passwordPolicy.guidance}
        required
        minLength={SECURITY_V1.passwordPolicy.minLength}
        maxLength={256}
        error={errors.find((e) => e.fieldId === "new-password")?.message}
      />
      <PasswordField
        id="confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        minLength={SECURITY_V1.passwordPolicy.minLength}
        maxLength={256}
        error={errors.find((e) => e.fieldId === "confirm-password")?.message}
      />
      <div className={styles.actions}>
        <ActionButton kind="primary" pending={pending} loadingText="Changing password…">
          Change password
        </ActionButton>
      </div>
    </form>
  );
}
