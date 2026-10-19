"use client";

import { safeSignInTarget } from "../../lib/sign-in-target";

import { useRef, useState, useSyncExternalStore } from "react";
import { ActionButton, ErrorSummary, Field, PasswordField } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "../page.module.css";
import signInStyles from "./sign-in.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

// Sign-in form: uncontrolled inputs (values live in the DOM, preserved across
// failures), submit via fetch to the same-origin proxy. Double-submit blocked
// with announced progress (04/05); focus moves to the summary on failure.
// §16.1 support reference (§16.14 correlationId) is appended when the API
// supplies one; the AUTH-* sentence itself stays verbatim.
export function SignInForm({
  returnTo,
  audience = "staff",
  demoAccount,
  demoStaff,
  home = false,
}: {
  returnTo?: string;
  audience?: "student" | "staff";
  home?: boolean;
  demoAccount?: { username: string; password: string };
  demoStaff?: Array<{
    role: string;
    username: string;
    password: string | null;
    blurb: string;
    canFill?: boolean;
    credentialHint?: string;
    workspaceHref?: string;
  }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [filledAccount, setFilledAccount] = useState<string | null>(null);
  const [demoQuery, setDemoQuery] = useState("");
  const visibleDemoStaff = demoStaff?.filter((account) =>
    `${account.username} ${account.role} ${account.blurb}`.toLowerCase().includes(demoQuery.trim().toLowerCase()),
  );
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );

  // A server-rendered form has no submit handler until React hydrates it.
  // Keep the native form from posting credentials to the page in that gap.

  function fillDetails(account: { username: string; password: string }) {
    if (pending) return;
    const username = formRef.current?.elements.namedItem("username");
    const password = formRef.current?.elements.namedItem("password");
    if (
      !(username instanceof HTMLInputElement) ||
      !(password instanceof HTMLInputElement)
    )
      return;
    username.value = account.username;
    password.value = account.password;
    setErrors([]);
    setFilledAccount(account.username);
    username.focus();
  }

  function fillDemoDetails() {
    if (!demoAccount) return;
    fillDetails(demoAccount);
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
          audience,
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
        // Preserve validated local workspace destinations through authentication.
        // The server resolves / from the actual active workspace. Demo account
        // labels and usernames cannot choose or combine authority.
        const target = safeSignInTarget(returnTo) ?? "/";
        // A new authenticated context must not reuse cached pages from the
        // previous account or role in this browser's client router.
        window.location.replace(target);
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
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="POST"
      noValidate={false}
      className={signInStyles.form}
    >
      {errors.length > 0 ? (
        <ErrorSummary title="We could not sign you in." errors={errors} />
      ) : null}
      <Field
        id="username"
        label="Username"
        help={home ? undefined : "Use the username from your SIS account."}
        autoComplete="username"
        error={errors.find((e) => e.fieldId === "username")?.message}
        inputProps={{ type: "text", required: true, maxLength: 64, placeholder: home ? "Enter your SIS username" : undefined }}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="current-password"
        required
        placeholder={home ? "Enter your password" : undefined}
        error={errors.find((e) => e.fieldId === "password")?.message}
      />
      {home ? <p className={styles.supporting}><a href="/recovery">Forgot password?</a></p> : null}
      <div className={`${styles.actions} ${home ? signInStyles.homeActions : ""}`}>
        <ActionButton
          kind="primary"
          pending={pending}
          disabled={!ready}
          loadingText="Signing in…"
        >
          Sign in
        </ActionButton>
      </div>
      {!ready ? <p role="status">Preparing secure sign-in…</p> : null}
      {!home ? <p className={styles.supporting}><a href="/recovery">Need help signing in?</a></p> : null}
      {demoAccount || (demoStaff && demoStaff.length > 0) ? (
        <details className={`${signInStyles.demoDisclosure} ${home ? signInStyles.homeDemo : ""}`}>
          <summary>{home ? "Try demo account" : "Try a fictional demo account"}</summary>
          <div className={signInStyles.demoList}>
            {demoAccount ? (
              <section
                className={signInStyles.demoPanel}
                aria-labelledby="demo-applicant-heading"
              >
                <p className={signInStyles.demoLabel}>
                  Fictional applicant demo
                </p>
                <h2 id="demo-applicant-heading">Try the applicant journey</h2>
                <p>
                  Use this shared account to explore applications. Everyone
                  using it can see its test applications. Enter fictional
                  information only.
                </p>
                <dl className={signInStyles.credentials}>
                  <div>
                    <dt>Username</dt>
                    <dd>
                      <code>{demoAccount.username}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Password</dt>
                    <dd>
                      <code>{demoAccount.password}</code>
                    </dd>
                  </div>
                </dl>
                <ActionButton
                  type="button"
                  kind="secondary"
                  onClick={fillDemoDetails}
                  disabled={!ready || pending}
                >
                  Fill demo applicant details
                </ActionButton>
                <p className={signInStyles.demoNote}>
                  Personal account registration is not available in this demo.
                </p>
                <p role="status" className={signInStyles.demoStatus}>
                  {filledAccount
                    ? "Demo details filled. Select Sign in to continue."
                    : "Fill the details, then select Sign in."}
                </p>
              </section>
            ) : null}
            {demoStaff && demoStaff.length > 0 ? (
              <section
                className={signInStyles.demoPanel}
                aria-labelledby="demo-staff-heading"
              >
                <p className={signInStyles.demoLabel}>Fictional demo accounts</p>
                <h2 id="demo-staff-heading">Try a demonstration workspace</h2>
                <p>
                  Sign in with the account for the workspace you need. Enter fictional
                  information only.
                </p>
                <label className={signInStyles.demoSearchLabel} htmlFor="demo-account-search">Find a demo account</label>
                <input
                  id="demo-account-search"
                  className={signInStyles.demoSearch}
                  type="search"
                  value={demoQuery}
                  onChange={(event) => setDemoQuery(event.target.value)}
                  placeholder="Search Moodle, timetable, registration…"
                />
                <p className={signInStyles.demoNote} role="status">
                  {visibleDemoStaff?.length ?? 0} demonstration accounts available
                  {demoQuery.trim() ? " for this search" : " for this account type"}.
                </p>
                <div className={signInStyles.demoAccounts}>
                {visibleDemoStaff?.map((staff) => (
                  <div key={staff.username}>
                    <h3>
                      {staff.role}: <code>{staff.username}</code>
                    </h3>
                    <p>{staff.blurb}</p>
                    <dl className={signInStyles.credentials}>
                      <div>
                        <dt>Username</dt>
                        <dd>
                          <code>{staff.username}</code>
                        </dd>
                      </div>
                      {staff.password ? <div>
                        <dt>Password</dt>
                        <dd>
                          <code>{staff.password}</code>
                        </dd>
                      </div> : null}
                    </dl>
                    {!staff.password ? <p className={signInStyles.demoNote}>{staff.credentialHint}</p> : null}
                    {staff.canFill !== false && staff.password ? <ActionButton
                      type="button"
                      kind="secondary"
                      onClick={() => fillDetails({ username: staff.username, password: staff.password as string })}
                      disabled={!ready || pending}
                    >
                      Fill {staff.role.toLowerCase()} details
                    </ActionButton> : null}
                  </div>
                ))}
                </div>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}
    </form>
  );
}
