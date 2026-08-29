<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: cc4664cd-9e4b-5312-885c-c2e65f7009cb; chronological message: 117. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 3: Account creation, password, phone-number verification and secure sign-in

This part defines the first authenticated experience. It must feel simple to a prospective applicant, including on a low-bandwidth phone, while preventing duplicate accounts, account takeover and accidental disclosure of personal information.

---

## 1. Purpose and scope

This part covers:

- Creating an applicant account
- Verifying an email address and/or mobile number
- Creating, entering and changing a password
- Signing in and signing out
- Password reset and account recovery
- Suspicious sign-in handling
- Session expiry and shared-device protection
- Accessibility and recovery behaviour

It does not verify that an applicant is the legal holder of an NRC, passport, ECZ result or qualification. Those are separate formal-verification processes later in the application workflow.

---

## 2. Account model

### 2.1 Minimum account data

An account is created with only information needed to establish secure access:

- Given name
- Family name
- Preferred email address and/or mobile number
- Password
- Consent to required terms and privacy notice
- Contact-verification status
- Account-security state

The initial registration screen should not ask for:

- NRC or passport number
- Full residential address
- Examination results
- Programme selection
- Employment information
- Medical, disability, sponsor or financial details

Those belong to later steps, when there is a clear reason to collect them.

### 2.2 Contact policy

The institution configures whether an applicant must have:

- A verified email address
- A verified mobile number
- Both
- At least one verified contact method

For the initial system, the recommended rule is:

> At least one verified contact method is required before an application can be started; both email and mobile number should be encouraged where the applicant can provide them.

The interface must clearly show which method is verified and which is only entered but unverified.

---

## 3. Entry points

A visitor may begin account creation by selecting:

- `Create account` from public navigation
- `Start application` from a programme page
- `Save eligibility guidance`
- `Continue application` from a shared but unauthenticated link
- `Sign in` after an expired session

Where the user started from a programme or eligibility check, the system preserves that context after successful registration and sign-in.

Example:

> You are creating an account to apply for **BSc Computer Science · January 2027 intake**.

The applicant may remove the saved programme context before continuing.

---

## 4. Create-account experience

### 4.1 Screen layout

The page title is:

> Create your applicant account

A concise explanation appears above the form:

> Create an account to save your application and receive secure updates. This does not submit an application or confirm admission.

The form uses one logical vertical sequence:

1. Name
2. Contact method
3. Password
4. Terms and privacy acknowledgement
5. `Create account`

The primary action remains visible on mobile without requiring a horizontal scroll.

### 4.2 Name fields

Fields:

- Given name
- Family name
- Other names — optional, with explanation where relevant

The form permits legitimate names containing spaces, hyphens, apostrophes and non-English characters. It must not reject a name merely because it does not follow a narrow Western format.

Validation occurs when the user leaves the field or submits the form.

Example error:

> Enter your given name as you would like it shown in your application.

The applicant may later provide legal/official-name evidence during formal application steps if the institution requires it.

### 4.3 Email address entry

The label is:

> Email address

Supporting text:

> Use an email address you can access. We will send a verification link and important account notices here.

Behaviour:

- Leading/trailing spaces are removed safely.
- The address is normalized for comparison where appropriate.
- The system checks basic format but does not claim the inbox exists before verification.
- The entered email is not exposed in full on later screens unless necessary.

Format error:

> Enter an email address in the format name@example.com.

Existing-account response:

> An account may already exist for this email address. Sign in or reset your password to continue.

The system should avoid revealing whether an account definitely exists to an unauthorized person. The same response is used for sign-in and recovery where appropriate.

### 4.4 Mobile-number entry

The label is:

> Mobile number

Supporting text:

> Enter a number that can receive an SMS verification code. Example: +260 97 123 4567.

The country selector defaults to Zambia (`+260`) but remains changeable for international applicants.

The interface:

- Stores the number in normalized international form.
- Lets the person enter spaces for readability.
- Shows the interpreted number before sending the code.
- Does not silently change the country code.
- States whether SMS charges may apply through the person’s mobile provider.

Format error:

> Check your mobile number. Include the country code, for example +260.

A mobile number is a communication channel, not proof of legal identity.

### 4.5 Password creation

The label is:

> Create password

The page presents requirements before submission, for example:

- At least the configured minimum length
- Not found in a known-compromised-password list where this control is enabled
- Not identical to the email address or mobile number
- Not a previously used password where password history applies

The exact complexity policy is centrally configured. The interface must not force arbitrary character-pattern rules merely because they are traditional.

Password behaviour:

- The password field supports paste and password managers.
- The user can reveal or hide the password using an accessible labelled control, for example `Show password`.
- Caps Lock warning appears only when detected and is never the only explanation for failure.
- The application does not display password strength as a score without actionable guidance.

Helpful message:

> Use a long password that you do not use on another website.

Error example:

> Choose a longer password. It must contain at least 12 characters.

### 4.6 Terms and privacy acknowledgement

The applicant sees:

- Link to privacy notice
- Link to applicant terms
- A clear statement of why contact details are collected
- Required acknowledgement control

The system records:

- Policy version
- Date and time accepted
- Language/version presented
- Account identifier
- Source channel

A pre-ticked consent box must not be used. Required processing notices must be distinguished from optional marketing preferences.

---

## 5. Account-creation submission behaviour

When the applicant selects `Create account`:

1. Client-side validation highlights immediately detectable errors.
2. Valid entered information remains visible and editable.
3. The primary button becomes `Creating account…`.
4. Duplicate taps/clicks are prevented.
5. The server validates the request again.
6. The password is transmitted only over a protected connection and never written to logs.
7. The system creates an account in `VerificationRequired` state.
8. A verification challenge is generated for the selected contact method.
9. An audit record and secure delivery request are created.
10. The applicant sees a precise confirmation screen.

Confirmation:

> Your account has been created. Verify your mobile number to continue. We sent a code to **+260 97••• 4567**.

The system must not say “Your account is fully active” before the required contact channel is verified.

### 5.1 Connection interruption

If the connection drops after submission:

> We are checking whether your account was created. Do not submit the form again yet.

The client checks the idempotency reference. It then shows one of:

- `Account created — continue to verification`
- `Account not created — safely retry`
- `We could not confirm the result — contact support with reference ACC-…`

The applicant must not receive duplicate accounts merely because they tapped twice or their connection failed.

---

## 6. Contact verification

### 6.1 Verification screen

The page title is:

> Verify your mobile number  
> or  
> Verify your email address

It displays:

- Masked contact destination
- Explanation of why verification is needed
- Verification-code input or email-link instructions
- Expiry time
- Resend control and permitted retry time
- `Use a different number/email`
- Help route if access to the contact method was lost

### 6.2 SMS one-time code

For mobile verification:

- The code uses a configurable expiry period.
- The input accepts pasted codes.
- On mobile, the browser may suggest the received code without making automatic submission mandatory.
- The user can enter the code one character at a time or paste the full code.
- Screen readers receive one clear announcement, not six noisy field announcements.
- The system restricts repeated failed attempts and resends to prevent abuse.

Success:

> Mobile number verified. You can now start an application.

Expired-code error:

> This verification code has expired. Request a new code and enter it here.

Incorrect-code error:

> That code does not match. Check the latest message we sent, or request a new code.

### 6.3 Email verification

For email verification:

- A signed, single-use verification link is delivered.
- The page explains that the user can return to this browser after opening their email.
- The link expires and cannot be reused.
- The email body contains a neutral explanation and does not include sensitive application details.
- If the link is opened on another device, the system verifies the email but requires normal sign-in before exposing the account.

Success:

> Email address verified. Sign in to continue securely.

### 6.4 Resend behaviour

The `Resend code` or `Resend link` control:

- Is disabled only for a visible, short anti-abuse interval.
- Shows the countdown in text, for example `You can request another code in 28 seconds`.
- Does not make the user guess whether a resend happened.
- Shows a new masked destination confirmation.
- Invalidates the previous verification code where policy requires it.

The system must record every verification send, attempt, expiry and result without storing the code itself in readable form.

### 6.5 Lost-access route

If the applicant cannot access the original number or email:

> Use a different contact method

The system requires the applicant to:

1. Enter the replacement contact method.
2. Verify the replacement.
3. Re-authenticate or complete the configured security check.
4. Receive confirmation that the account contact has changed.

High-risk changes, such as replacing the only verified contact method after a password reset, may enter a temporary protection state and notify the previous verified contact where safe.

---

## 7. Sign-in experience

### 7.1 Screen

The page title is:

> Sign in to your applicant account

Fields:

- Email address or mobile number
- Password
- `Sign in`
- `Forgot password?`
- `Create account`

The page supports password managers, copy/paste and keyboard-only use.

The system uses a generic failed-sign-in message:

> We could not sign you in with those details. Check them and try again, or reset your password.

It must not reveal whether the account, email, mobile number or password was the issue.

### 7.2 Successful sign-in

After successful sign-in:

- The user returns to the intended page when it is safe.
- Otherwise, the user goes to applicant home.
- The system displays a brief non-blocking confirmation if necessary.
- The active session is associated with account, device/session metadata and risk state.
- An account-security event is recorded.

If required contact verification remains incomplete:

> Your account is not yet ready to start an application. Verify your mobile number or email address.

The applicant is directed to verification, not silently blocked later in the form.

### 7.3 Failed attempts and protection

Repeated failed sign-in attempts trigger progressive protection without exposing account existence:

- Short delay after repeated failures
- CAPTCHA-free or accessible alternative challenge where a challenge is necessary
- Temporary rate limit if the attack pattern continues
- Security notification to the account holder after a configurable threshold
- Support route for legitimate users who are blocked

The system must not use image-only CAPTCHA as the sole recovery mechanism.

### 7.4 Unusual sign-in

If configured risk signals indicate an unusual sign-in—for example, a new device combined with a suspicious pattern—the system may require an additional verification step.

The message remains neutral:

> For your security, verify this sign-in using your verified contact method.

The system records why additional verification was required, but does not expose sensitive fraud-detection rules to the user.

---

## 8. Password reset and account recovery

### 8.1 Forgotten-password flow

Starting from `Forgot password?`, the user provides email or mobile number.

The response is always generic:

> If an account matches those details, we sent instructions to continue.

This reduces account-enumeration risk.

The reset instruction:

- Is time-limited and single-use.
- Does not reveal application information.
- Requires a new password that passes current policy.
- Invalidates active sessions after successful reset, except the newly created recovery session where appropriate.
- Sends an account-security notification to verified channels.

### 8.2 Reset-password screen

The page contains:

- New password
- Confirm password
- Password requirements
- `Reset password`

Mismatch error:

> The passwords do not match. Enter the same new password in both fields.

Success:

> Your password has been reset. Sign in using your new password.

### 8.3 Lost password and lost contact method

This is a higher-risk recovery case. The system must not let a person take over an account simply by supplying a name or an unverified new number.

The interface provides:

> I cannot access my password or verified contact method

It creates a restricted account-recovery request. The future detailed recovery blueprint must define:

- Required evidence and allowed verification routes
- Human-review authority
- Service timelines
- How recovered access is communicated
- How impersonation risk is reduced
- Audit and escalation requirements

Until that review is complete, the applicant cannot access or change the account.

---

## 9. Session, sign-out and shared-device behaviour

### 9.1 Session expiry

Before a session expires, show a modal or focused notice:

> Your session will expire in 2 minutes to protect your information. Continue session?

Actions:

- `Continue session`
- `Sign out now`

If the user is editing a valid draft, the system saves it where safe before expiry. Password fields, verification codes and payment authorizations are never preserved as drafts.

### 9.2 Sign out

Selecting `Sign out`:

1. Ends the server-side session.
2. Clears session tokens from the browser securely.
3. Returns to public admissions home.
4. Prevents protected pages from being restored from browser cache.
5. Shows: `You have signed out safely.`

---

## 10. Accessibility and low-bandwidth requirements

- All fields have persistent visible labels; placeholders never replace labels.
- Validation errors are linked to the correct field and announced to screen readers.
- Password visibility controls have accessible names and states.
- Verification-code input can be completed with keyboard, paste, speech input and screen-reader navigation.
- Error colour is always paired with text and an icon or status label.
- Focus moves to the page heading after a route change and to the error summary after a failed submission.
- Forms work at 200% zoom and on narrow mobile screens without horizontal scrolling.
- SMS verification is not the only route where the configured policy permits email verification.
- On slow connections, the interface retains entered non-sensitive values and clearly distinguishes `Saving`, `Saved`, `Not saved`, and `Retry needed`.
- No account or password status is exposed through a push notification preview or an unprotected email subject line.

---

## 11. Architecture contract

### 11.1 Account states

| State | Meaning |
|---|---|
| `RegistrationStarted` | The account-creation request has begun but is not complete |
| `VerificationRequired` | Account exists; required contact verification is incomplete |
| `Active` | Account meets basic access requirements |
| `ProtectionRequired` | Additional security check is required before sensitive action |
| `RecoveryPending` | Human-controlled recovery process is underway |
| `TemporarilyRestricted` | Access is limited because of security or abuse controls |
| `Closed` | Account is no longer available for sign-in under retention policy |

### 11.2 Commands

| Command | Primary result |
|---|---|
| `CreateApplicantAccount` | Creates an account in `VerificationRequired` state |
| `RequestContactVerification` | Generates and sends a verification challenge |
| `VerifyApplicantContactMethod` | Records verified contact method |
| `AuthenticateApplicant` | Creates a controlled applicant session |
| `RequestPasswordReset` | Creates a secure password-reset challenge |
| `ResetApplicantPassword` | Updates password and revokes relevant sessions |
| `ChangeApplicantContactMethod` | Requests controlled replacement of a contact method |
| `InitiateAccountRecovery` | Creates a restricted recovery case |
| `TerminateApplicantSession` | Ends the active session |

### 11.3 Resulting events

- `ApplicantAccountCreated`
- `ApplicantVerificationRequested`
- `ApplicantContactVerified`
- `ApplicantSignInSucceeded`
- `ApplicantSignInFailed`
- `ApplicantSecurityChallengeRequired`
- `ApplicantPasswordResetRequested`
- `ApplicantPasswordResetCompleted`
- `ApplicantContactChangeRequested`
- `ApplicantContactChanged`
- `ApplicantAccountRecoveryInitiated`
- `ApplicantSessionTerminated`

### 11.4 Audit record

For security-sensitive events, record:

- Account/person identifier
- Event type
- Date and time
- Session/device metadata as permitted
- Contact channel involved, masked in routine views
- Outcome
- Security-control reason where applicable
- Correlation/idempotency reference
- Acting user, for any human recovery action

Passwords, one-time codes, raw reset tokens and full secrets must never appear in audit logs, notifications or support tickets.

---

## 12. Part 3 acceptance tests

Part 3 is accepted when:

- An applicant can create an account with the minimum necessary information.
- Account/contact verification is clearly separate from formal identity and eligibility verification.
- Email and mobile number are normalized, verified and safely masked.
- Existing-account, failed-sign-in and password-reset responses do not expose whether an account exists.
- Password managers, paste and accessible authentication methods work.
- A duplicate submit or interrupted connection does not create duplicate accounts.
- Verification expiry, resend, wrong-code, lost-access and delivery-failure states all provide a clear recovery route.
- Repeated failed sign-ins are protected without making legitimate recovery inaccessible.
- Password reset revokes appropriate existing sessions and generates security notifications.
- A logged-out browser cannot reveal prior protected content through back navigation.
- Every security-sensitive action is auditable without storing secrets.
- Keyboard, screen-reader, zoom, mobile and low-bandwidth tests pass.

**Please approve Part 3: Account creation, password, phone-number verification and secure sign-in.** After approval, I will continue with Part 4: **starting, saving, resuming and managing an application draft**.

---

## Following user responses before the next design record

### User message 0118

proceed to Part 4: **starting, saving, resuming and managing an application draft**.
