"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton, ErrorSummary, Field, PasswordField } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "../page.module.css";
import signInStyles from "./sign-in.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

// Sign-in form: uncontrolled inputs (values live in the DOM, preserved across
// failures), submit via fetch to the same-origin proxy. Double-submit blocked
// with announced progress (04/05); focus moves to the summary on failure.
// §16.1 support reference (§16.14 correlationId) is appended when the API
// supplies one; the AUTH-* sentence itself stays verbatim.
export function SignInForm({
  returnTo,
  demoAccount,
}: {
  returnTo?: string;
  demoAccount?: { username: string; password: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [demoDetailsFilled, setDemoDetailsFilled] = useState(false);

  function fillDemoDetails() {
    if (!demoAccount || pending) return;
    const username = formRef.current?.elements.namedItem("username");
    const password = formRef.current?.elements.namedItem("password");
    if (!(username instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) return;
    username.value = demoAccount.username;
    password.value = demoAccount.password;
    setErrors([]);
    setDemoDetailsFilled(true);
    username.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors([]);
    try {
      const data = new FormData(event.currentTarget);
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          username: data.get("username"),
          password: data.get("password"),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        reference?: string;
      };
      const ref = body.reference ? ` (Reference: ${body.reference})` : "";
      if (res.ok) {
        // Only local applicant/discovery routes survive authentication.
        const target =
          returnTo &&
          /^\/(applicant|discover)(\/|\?|$)/.test(returnTo) &&
          !/[\\\r\n]/.test(returnTo)
            ? returnTo
            : demoDetailsFilled && data.get("username") === demoAccount?.username
              ? "/applicant"
              : "/";
        router.replace(target);
        router.refresh();
        return;
      }
      if (res.status === 429) {
        setErrors([
          {
            fieldId: "username",
            message: `${body.message ?? AUTH_MESSAGES.rateLimited.text}${ref}`,
          },
        ]);
      } else {
        setErrors([
          {
            fieldId: "password",
            message: `${body.message ?? AUTH_MESSAGES.signInFailure.text}${ref}`,
          },
        ]);
      }
    } catch {
      setErrors([
        {
          fieldId: "username",
          message:
            "We could not confirm whether your request was received. Check your connection — your entries are kept — then try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate={false} className={signInStyles.form}>
      {demoAccount ? (
        <section className={signInStyles.demoPanel} aria-labelledby="demo-applicant-heading">
          <p className={signInStyles.demoLabel}>Fictional applicant demo</p>
          <h2 id="demo-applicant-heading">Try the applicant journey</h2>
          <p>
            Use this shared account to explore applications. Everyone using it
            can see its test applications. Enter fictional information only.
          </p>
          <dl className={signInStyles.credentials}>
            <div><dt>Username</dt><dd><code>{demoAccount.username}</code></dd></div>
            <div><dt>Password</dt><dd><code>{demoAccount.password}</code></dd></div>
          </dl>
          <ActionButton type="button" kind="secondary" onClick={fillDemoDetails} disabled={pending}>
            Fill demo applicant details
          </ActionButton>
          <p className={signInStyles.demoNote}>
            Personal account registration is not available in this demo.
          </p>
          <p role="status" className={signInStyles.demoStatus}>
            {demoDetailsFilled ? "Demo details filled. Select Sign in to continue." : "Fill the details, then select Sign in."}
          </p>
        </section>
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="We could not sign you in." errors={errors} />
      ) : null}
      <Field
        id="username"
        label="Username"
        help={demoAccount ? "Enter your SIS username, or use the demo applicant details above." : "The username from your account letter."}
        autoComplete="username"
        error={errors.find((e) => e.fieldId === "username")?.message}
        inputProps={{ type: "text", required: true, maxLength: 64 }}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        required
        error={errors.find((e) => e.fieldId === "password")?.message}
      />
      <div className={styles.actions}>
        <ActionButton
          kind="primary"
          pending={pending}
          loadingText="Signing in…"
        >
          Sign in
        </ActionButton>
      </div>
      <p className={styles.supporting}>
        <a href="/recovery">Need help signing in?</a>
      </p>
    </form>
  );
}
