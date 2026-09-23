"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";
import { formatMinor } from "../../../../lib/money";
import styles from "../../../applicant/applicant.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

export interface PayInitial {
  outstandingMinor: number;
  currency: string;
  dueAt: string | null;
  methods: Array<{ key: string; label: string }>;
  openReference: string | null;
  openStatus: string | null;
}

async function postFinance(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/finance${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { message?: string }).message ??
        "The finance service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string; reference?: string } })
      .detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}${detail?.reference ? ` Existing request: ${detail.reference}.` : ""}`;
  }
  return "We could not confirm the result. Check your payment requests before retrying.";
}

// Payment initiation: the method is never preselected; the amount defaults
// to the outstanding balance but stays editable. Double taps are blocked
// with announced progress; an open request refuses with its reference.
export function PayForms({ initial }: { initial: PayInitial }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(kind: "initiate" | "report", form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const body =
        kind === "initiate"
          ? {
              amountMinor: Number(data.get("pay-amount") ?? 0),
              method: String(data.get("pay-method") ?? ""),
              idempotencyKey: crypto.randomUUID(),
            }
          : {
              amountMinor: Number(data.get("report-amount") ?? 0),
              method: String(data.get("report-method") ?? ""),
              payerReference: String(data.get("report-reference") ?? ""),
              idempotencyKey: crypto.randomUUID(),
            };
      const out = (await postFinance(
        kind === "initiate" ? "/payments/initiate" : "/payments/report",
        body,
      )) as {
        reference?: string;
        safeMessage?: string;
        partialWarning?: string | null;
      };
      setNotice(
        `${out.safeMessage ?? "Request recorded."} Reference: ${out.reference ?? ""}${out.partialWarning ? ` ${out.partialWarning}` : ""}`,
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([
        {
          fieldId: kind === "initiate" ? "pay-method" : "report-method",
          message: errorText(error),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Request recorded" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The payment was not started" errors={errors} />
      ) : null}
      {initial.openReference ? (
        <Notice
          severity="warning"
          title="A payment is already being checked"
          message={`Request ${initial.openReference} (${initial.openStatus}) is still open. Do not pay again until its status is updated.`}
        />
      ) : null}
      <h2>Make a payment (simulated)</h2>
      <p className={styles.muted}>
        Amount due: {formatMinor(initial.currency, initial.outstandingMinor)}
        {initial.dueAt ? ` · Deadline ${initial.dueAt}` : ""}. Paying the full
        amount meets the current registration payment requirement once
        Finance confirms and reconciles it. A smaller amount reduces your
        balance but will not complete clearance without an approved
        arrangement. This is a labelled demonstration simulator: no real
        money moves and no card details are entered here.
      </p>
      <form
        aria-label="Initiate a simulated payment"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("initiate", e.currentTarget);
        }}
      >
        <fieldset>
          <legend>Payment method (choose one)</legend>
          {initial.methods.map((method) => (
            <p key={method.key}>
              <label htmlFor={`pay-method-${method.key}`}>
                <input
                  id={`pay-method-${method.key}`}
                  name="pay-method"
                  type="radio"
                  value={method.key}
                  required
                />{" "}
                {method.label}
              </label>
            </p>
          ))}
        </fieldset>
        <p>
          <label htmlFor="pay-amount">Amount in tambala</label>{" "}
          <input
            id="pay-amount"
            name="pay-amount"
            type="number"
            min={1}
            defaultValue={initial.outstandingMinor}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Starting payment…" : "Start simulated payment"}
          </button>
        </p>
      </form>
      <h2>Report a bank or cashier payment</h2>
      <p className={styles.muted}>
        Reporting is not paying: Finance matches your reference before
        anything is confirmed.
      </p>
      <form
        aria-label="Report an offline payment"
        onSubmit={(e) => {
          e.preventDefault();
          void submit("report", e.currentTarget);
        }}
      >
        <p>
          <label htmlFor="report-method">Method</label>{" "}
          <select id="report-method" name="report-method" required>
            <option value="">Choose…</option>
            <option value="BANK_TRANSFER">Bank transfer / deposit</option>
            <option value="CASHIER">In-person cashier</option>
          </select>
        </p>
        <p>
          <label htmlFor="report-amount">Amount in tambala</label>{" "}
          <input
            id="report-amount"
            name="report-amount"
            type="number"
            min={1}
            required
          />
        </p>
        <p>
          <label htmlFor="report-reference">Bank or cashier reference</label>{" "}
          <input
            id="report-reference"
            name="report-reference"
            type="text"
            maxLength={64}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Reporting payment…" : "Report payment"}
          </button>
        </p>
      </form>
    </>
  );
}
