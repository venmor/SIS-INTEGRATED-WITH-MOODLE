"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@sis/ui";
import { ErrorSummary } from "@sis/ui";
import { Field } from "@sis/ui";
import { Notice } from "@sis/ui";
import {
  applicantRequest,
  errorMessage,
} from "../../api";

interface FieldError {
  fieldId: string;
  message: string;
}

// Applicant-initiated correction: creates a reviewable request, never edits
// submitted data. Duplicate open items are redirected server-side.
export function CorrectionForm({
  applicationId,
  version,
}: {
  applicationId: string;
  version: number;
}) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const key = useRef<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors([]);
    setCreated(null);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const data = new FormData(event.currentTarget);
      const result = await applicantRequest<{ id: string }>(
        `/${applicationId}/corrections`,
        {
          version,
          section: String(data.get("section") ?? ""),
          field: String(data.get("field") ?? ""),
          reason: String(data.get("reason") ?? ""),
          idempotencyKey: key.current,
        },
      );
      key.current = null;
      (event.target as HTMLFormElement).reset();
      setCreated(result.id);
    } catch (error) {
      setErrors([{ fieldId: "section", message: errorMessage(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Request a correction">
      {created ? (
        <Notice
          severity="success"
          title="Correction requested"
          message="Admissions will review it. The submitted application is unchanged until approval."
        />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The request was not sent" errors={errors} />
      ) : null}
      <Field
        id="correction-section"
        label="Category"
        help="Personal, contact, qualifications or programme."
        inputProps={{ name: "section", maxLength: 32 }}
      />
      <Field
        id="correction-field"
        label="Item to correct"
        help="Name the exact item, for example mobile number."
        inputProps={{ name: "field", maxLength: 80 }}
      />
      <Field
        id="correction-reason"
        label="Reason"
        inputProps={{ name: "reason", maxLength: 1000 }}
      />
      <p>
        <ActionButton
          type="submit"
          pending={pending}
          loadingText="Sending request…"
        >
          Request correction
        </ActionButton>
      </p>
    </form>
  );
}
