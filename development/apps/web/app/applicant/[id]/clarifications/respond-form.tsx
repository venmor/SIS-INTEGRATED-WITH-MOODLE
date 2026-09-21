"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@sis/ui";
import { ErrorSummary } from "@sis/ui";
import { Notice } from "@sis/ui";
import {
  applicantRequest,
  errorMessage,
} from "../../api";

interface FieldError {
  fieldId: string;
  message: string;
}

// Scoped clarification response: only the asked item can be answered here.
// The idempotency key survives retries of the same attempt; a receipt lookup
// is unnecessary because the answered state renders from the next load.
export function RespondForm({
  applicationId,
  clarificationId,
  version,
}: {
  applicationId: string;
  clarificationId: string;
  version: number;
}) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [response, setResponse] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const key = useRef<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!response.trim()) {
      setErrors([
        { fieldId: "response", message: "Write a response before submitting." },
      ]);
      return;
    }
    setPending(true);
    setErrors([]);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const result = await applicantRequest<{ receipt: string }>(
        `/${applicationId}/clarifications/${clarificationId}/respond`,
        {
          version,
          response: response.trim(),
          idempotencyKey: key.current,
        },
      );
      key.current = null;
      setReceipt(result.receipt);
    } catch (error) {
      setErrors([
        {
          fieldId: "response",
          message: errorMessage(error),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Respond to clarification request">
      {receipt ? (
        <Notice
          severity="success"
          title="Response received"
          message={`Admissions will review it and update the application status. Receipt: ${receipt}.`}
        />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The response was not sent" errors={errors} />
      ) : null}
      <p>
        <label htmlFor={`response-${clarificationId}`}>
          Your response (only this item)
        </label>
      </p>
      <textarea
        id={`response-${clarificationId}`}
        name="response"
        rows={4}
        maxLength={2000}
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        aria-invalid={errors.length > 0}
      />
      <p>
        <ActionButton
          type="submit"
          pending={pending}
          loadingText="Sending response…"
        >
          Submit response
        </ActionButton>
      </p>
      <Notice
        severity="info"
        title="Locked on send"
        message="The response locks with a receipt. Other submitted details stay unchanged."
      />
    </form>
  );
}
