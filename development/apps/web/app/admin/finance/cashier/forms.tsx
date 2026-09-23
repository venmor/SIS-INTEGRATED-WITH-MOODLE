"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
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

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Cashier intake: record a reported bank/cash payment against its receipt
// number, then confirm it into the ledger. Amounts must match exactly.
export function CashierForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function act(
    path: string,
    body: Record<string, unknown>,
    done: string,
    form: HTMLFormElement,
  ) {
    if (pending) return;
    setPending(path);
    setErrors([]);
    setNotice(null);
    try {
      await postFinance(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "cash-reference", message: failure(error) }]);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="Cash intake was not recorded" errors={errors} />
      ) : null}
      <h2>Record cash intake</h2>
      <form
        aria-label="Record cash intake"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            "/cashier/intake",
            {
              requestReference: String(data.get("cash-reference") ?? ""),
              amountMinor: Number(data.get("cash-amount") ?? 0),
              cashReceiptNo: String(data.get("cash-receipt") ?? ""),
            },
            "Intake recorded as provisional. Confirm it below to post.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="cash-reference">Payment request reference</label>{" "}
          <input id="cash-reference" name="cash-reference" type="text" maxLength={32} required />
        </p>
        <p>
          <label htmlFor="cash-amount">Amount in tambala</label>{" "}
          <input id="cash-amount" name="cash-amount" type="number" min={1} required />
        </p>
        <p>
          <label htmlFor="cash-receipt">Cashier receipt number</label>{" "}
          <input id="cash-receipt" name="cash-receipt" type="text" maxLength={64} required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Recording…" : "Record intake"}
          </button>
        </p>
      </form>
      <h2>Confirm intake into the ledger</h2>
      <form
        aria-label="Confirm cash intake"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            "/cashier/confirm",
            {
              requestReference: String(data.get("confirm-reference") ?? ""),
            },
            "Intake confirmed and allocated. Clearance recalculates.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="confirm-reference">Payment request reference</label>{" "}
          <input
            id="confirm-reference"
            name="confirm-reference"
            type="text"
            maxLength={32}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Confirming…" : "Confirm intake"}
          </button>
        </p>
      </form>
    </>
  );
}
