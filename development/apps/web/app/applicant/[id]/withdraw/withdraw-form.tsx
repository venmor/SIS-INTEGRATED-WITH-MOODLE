"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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

// Withdrawal needs deliberate confirmation: checkbox plus explicit submit.
// The receipt proves the request; assessment ends only when the server
// confirms the state change.
export function WithdrawForm({
  applicationId,
  reference,
  version,
}: {
  applicationId: string;
  reference: string;
  version: number;
}) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const key = useRef<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    if (data.get("confirm") !== "yes") {
      setErrors([
        {
          fieldId: "confirm",
          message: "Confirm the withdrawal to continue.",
        },
      ]);
      return;
    }
    setPending(true);
    setErrors([]);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const result = await applicantRequest<{ receipt: string }>(
        `/${applicationId}/withdraw`,
        {
          version,
          confirmed: true,
          reason: String(data.get("reason") ?? ""),
          idempotencyKey: key.current,
        },
      );
      key.current = null;
      setReceipt(result.receipt);
    } catch (error) {
      setErrors([{ fieldId: "confirm", message: errorMessage(error) }]);
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <>
        <Notice
          severity="success"
          title="Withdrawal requested"
          message={`Reference ${reference} will show the outcome when Admissions confirms it. Receipt: ${receipt}.`}
        />
        <p>
          <Link href={`/applicant/${applicationId}/status`}>
            View status timeline
          </Link>
        </p>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-label="Withdraw application">
      {errors.length > 0 ? (
        <ErrorSummary title="The withdrawal was not sent" errors={errors} />
      ) : null}
      <p>
        <label>
          <input type="checkbox" name="confirm" value="yes" id="confirm" /> I
          understand assessment of application {reference} ends, and that this
          does not request a refund.
        </label>
      </p>
      <p>
        <label htmlFor="withdraw-reason">
          Reason (optional, helps Admissions improve the process)
        </label>
      </p>
      <input
        id="withdraw-reason"
        name="reason"
        type="text"
        maxLength={500}
        autoComplete="off"
      />
      <p>
        <ActionButton
          type="submit"
          pending={pending}
          loadingText="Sending request…"
        >
          Submit withdrawal request
        </ActionButton>
      </p>
    </form>
  );
}
