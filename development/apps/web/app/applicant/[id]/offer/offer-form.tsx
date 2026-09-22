"use client";

import { useState } from "react";
import type { ApplicantOfferView } from "@sis/contracts";
import { ErrorSummary, Notice } from "@sis/ui";
import { applicantRequest, errorMessage } from "../../api";

// Offer response in two deliberate steps (Part 10 s4): review the offer with
// its conditions and deadline, confirm every acceptance declaration, then
// record. Decline is a separate confirmed action. Neither choice is
// preselected; a stored response replays its receipt instead of recording
// twice. Declaration texts mirror the versioned demo offer policy.
const DECLARATIONS = [
  {
    key: "UNDERSTAND_TERMS",
    text: "I understand the offer terms and conditions.",
  },
  {
    key: "ACCEPT_PROGRAMME",
    text: "I accept the offered programme and intake.",
  },
  {
    key: "INFO_ACCURATE",
    text: "My information remains accurate to my knowledge.",
  },
  {
    key: "REGISTRATION_SEPARATE",
    text: "I understand registration is a separate later process.",
  },
];

export function OfferForm({ offer }: { offer: ApplicantOfferView }) {
  const [step, setStep] = useState<"choose" | "accept" | "decline">("choose");
  const [errors, setErrors] = useState<Array<{ fieldId: string; message: string }>>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function respond(
    decision: "ACCEPT" | "DECLINE",
    form: HTMLFormElement,
  ) {
    if (pending) return;
    setPending(decision);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const timeline = await applicantRequest<{ version: number }>(
        `/${offer.applicationId}/timeline`,
      );
      const receipt = await applicantRequest<{ receipt: string }>(
        `/${offer.applicationId}/offer/response`,
        {
          version: timeline.version,
          idempotencyKey: crypto.randomUUID(),
          decision,
          reason:
            decision === "DECLINE"
              ? String(data.get("decline-reason") ?? "")
              : undefined,
          declarations:
            decision === "ACCEPT"
              ? DECLARATIONS.filter((d) =>
                  data.get(`declaration-${d.key}`),
                ).map((d) => d.key)
              : undefined,
        },
      );
      setNotice(
        decision === "ACCEPT"
          ? `Offer accepted. Receipt: ${receipt.receipt} View onboarding tasks next.`
          : `Offer declined. Receipt: ${receipt.receipt}`,
      );
      setStep("choose");
      form.reset();
    } catch (error) {
      setErrors([{ fieldId: "offer-response", message: errorMessage(error) }]);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Response recorded" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The response was not sent" errors={errors} />
      ) : null}
      {step === "choose" ? (
        <>
          <h2>Accept this admission offer?</h2>
          <p>
            You are accepting an offer for: {offer.programmeName} ·{" "}
            {offer.intake} · {offer.studyMode} · {offer.campus}
          </p>
          <p>
            <button type="button" onClick={() => setStep("accept")}>
              Review and accept
            </button>
          </p>
          <h2>Decline this admission offer?</h2>
          <p>
            <button type="button" onClick={() => setStep("decline")}>
              Review and decline
            </button>
          </p>
        </>
      ) : null}
      {step === "accept" ? (
        <form
          aria-label="Confirm acceptance of the admission offer"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <h2>Accept this admission offer?</h2>
          <p>
            You are accepting an offer for: {offer.programmeName} ·{" "}
            {offer.intake} · {offer.studyMode} · {offer.campus}
          </p>
          <p>
            {offer.conditions.length} condition
            {offer.conditions.length === 1 ? "" : "s"} apply. Missing a
            condition or deadline can affect registration where the condition
            requires it.
          </p>
          <p>You will then complete required onboarding actions. Acceptance does not yet mean you are registered for classes.</p>
          <fieldset>
            <legend>Acceptance declarations (all required)</legend>
            {DECLARATIONS.map((declaration) => (
              <p key={declaration.key}>
                <label htmlFor={`declaration-${declaration.key}`}>
                  <input
                    id={`declaration-${declaration.key}`}
                    name={`declaration-${declaration.key}`}
                    type="checkbox"
                    value={declaration.key}
                  />{" "}
                  {declaration.text}
                </label>
              </p>
            ))}
          </fieldset>
          <p>
            <button
              type="button"
              disabled={pending !== null}
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                if (form) void respond("ACCEPT", form as HTMLFormElement);
              }}
            >
              {pending === "ACCEPT" ? "Recording acceptance…" : "Accept offer"}
            </button>{" "}
            <button type="button" onClick={() => setStep("choose")}>
              Back
            </button>
          </p>
        </form>
      ) : null}
      {step === "decline" ? (
        <form
          aria-label="Confirm decline of the admission offer"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <h2>Decline this admission offer?</h2>
          <p>
            Declining ends this offer. Capacity returns through the admissions
            workflow; reconsideration follows policy only.
          </p>
          <p>
            <label htmlFor="decline-reason">Reason (optional)</label>{" "}
            <input
              id="decline-reason"
              name="decline-reason"
              type="text"
              maxLength={500}
            />
          </p>
          <p>
            <button
              type="button"
              disabled={pending !== null}
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                if (form) void respond("DECLINE", form as HTMLFormElement);
              }}
            >
              {pending === "DECLINE" ? "Recording…" : "Confirm decline"}
            </button>{" "}
            <button type="button" onClick={() => setStep("choose")}>
              Back
            </button>
          </p>
        </form>
      ) : null}
    </>
  );
}
