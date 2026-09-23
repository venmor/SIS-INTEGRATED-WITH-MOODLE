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

// Sponsorship recording: attested evidence confirms immediately; bare
// records wait for confirmation. Changes always create new versions.
export function SponsorshipForms({ attemptId }: { attemptId?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function record(form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const out = (await postFinance("/sponsorships", {
        attemptId:
          attemptId ?? String(data.get("sponsor-attempt") ?? ""),
        sponsorName: String(data.get("sponsor-name") ?? ""),
        categories: [String(data.get("sponsor-category") ?? "")],
        coverageType: String(data.get("sponsor-coverage-type") ?? ""),
        coverageValue: Number(data.get("sponsor-coverage-value") ?? 0),
        evidenceNote: String(data.get("sponsor-evidence") ?? "") || undefined,
        idempotencyKey: crypto.randomUUID(),
      })) as { status?: string };
      setNotice(
        `Sponsorship recorded (${out.status ?? "unknown"}). A promise is not cash: coverage counts only once confirmed.`,
      );
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "sponsor-name", message: failure(error) }]);
    } finally {
      setPending(false);
    }
  }

  async function confirm(id: string) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      await postFinance(`/sponsorships/${id}/confirm`, {
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice("Sponsorship confirmed. Clearance recalculates.");
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "sponsor-name", message: failure(error) }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The sponsorship was not recorded" errors={errors} />
      ) : null}
      <form
        aria-label="Record sponsorship"
        onSubmit={(e) => {
          e.preventDefault();
          void record(e.currentTarget);
        }}
      >
        {!attemptId ? (
          <p>
            <label htmlFor="sponsor-attempt">Programme attempt ID</label>{" "}
            <input
              id="sponsor-attempt"
              name="sponsor-attempt"
              type="text"
              required
            />
          </p>
        ) : null}
        <p>
          <label htmlFor="sponsor-name">Sponsoring organisation</label>{" "}
          <input id="sponsor-name" name="sponsor-name" type="text" maxLength={200} required />
        </p>
        <p>
          <label htmlFor="sponsor-category">Covered category</label>{" "}
          <select id="sponsor-category" name="sponsor-category" required>
            <option value="">Choose…</option>
            <option value="Tuition">Tuition</option>
            <option value="Registration fee">Registration fee</option>
            <option value="Accommodation fee">Accommodation fee</option>
          </select>
        </p>
        <p>
          <label htmlFor="sponsor-coverage-type">Coverage type</label>{" "}
          <select id="sponsor-coverage-type" name="sponsor-coverage-type" required>
            <option value="">Choose…</option>
            <option value="AMOUNT">Fixed amount (tambala)</option>
            <option value="PERCENT">Percentage (1–100)</option>
          </select>
        </p>
        <p>
          <label htmlFor="sponsor-coverage-value">Coverage value</label>{" "}
          <input
            id="sponsor-coverage-value"
            name="sponsor-coverage-value"
            type="number"
            min={1}
            required
          />
        </p>
        <p>
          <label htmlFor="sponsor-evidence">
            Evidence reference (confirms immediately)
          </label>{" "}
          <input
            id="sponsor-evidence"
            name="sponsor-evidence"
            type="text"
            maxLength={2000}
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record sponsorship"}
          </button>
        </p>
      </form>
      <ConfirmButton onConfirm={confirm} pending={pending} />
    </>
  );
}

function ConfirmButton({
  onConfirm,
  pending,
}: {
  onConfirm: (id: string) => void;
  pending: boolean;
}) {
  const [id, setId] = useState("");
  return (
    <form
      aria-label="Confirm draft sponsorship"
      onSubmit={(e) => {
        e.preventDefault();
        if (id.trim()) onConfirm(id.trim());
      }}
    >
      <p>
        <label htmlFor="sponsor-confirm-id">Draft sponsorship ID</label>{" "}
        <input
          id="sponsor-confirm-id"
          name="sponsor-confirm-id"
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
      </p>
      <p>
        <button type="submit" disabled={pending}>
          Confirm sponsorship
        </button>
      </p>
    </form>
  );
}
