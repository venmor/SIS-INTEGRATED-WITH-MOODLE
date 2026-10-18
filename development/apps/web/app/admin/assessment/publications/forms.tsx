"use client";
import staffUi from "../../staff-workspace.module.css";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";
const declaration =
  "I confirm that I have reviewed the stated evidence and make this decision within my assigned authority.";

function useResultCommand() {
  const router = useRouter();
  const request = useRef<{ key: string; payload: string; path: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [uncertain, setUncertain] = useState(false);
  async function send(path: string, body: object) {
    if (pending) return;
    const payload = JSON.stringify(body);
    if (!request.current || (!uncertain && request.current.payload !== payload))
      request.current = { key: crypto.randomUUID(), payload, path };
    if (uncertain && request.current.payload !== payload) {
      setError(
        "Check the current publication state before changing this decision.",
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/assessment${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({ ...body, idempotencyKey: request.current.key }),
        credentials: "same-origin",
        cache: "no-store",
      });
      let data;
      try {
        data = await response.json();
      } catch {
        setUncertain(true);
        throw new Error(
          "The response was interrupted. Check using the same request reference before changing this decision.",
        );
      }
      if (!response.ok) {
        setUncertain(response.status >= 500);
        throw new Error(
          data.message ??
            "The action could not be confirmed. Check the current publication state.",
        );
      }
      setUncertain(false);
      setReceipt(`Recorded. Reference: ${data.id}.`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The action could not be confirmed. Check the current publication state.",
      );
      if (e instanceof TypeError) setUncertain(true);
    } finally {
      setPending(false);
    }
  }
  const retry = () => {
    if (request.current)
      void send(request.current.path, JSON.parse(request.current.payload));
  };
  return { send, retry, pending, error, receipt, uncertain };
}
export function PublicationDecisionForm({
  target,
  version,
  amendment = false,
}: {
  target: string;
  version: number;
  amendment?: boolean;
}) {
  const command = useResultCommand();
  const [confirming, setConfirming] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const id = "result-publication-declaration";
  async function confirm(form: HTMLFormElement) {
    if (command.uncertain) { command.retry(); return; }
    const data = new FormData(form);
    if (!data.get(id)) return;
    setConfirming(true);
    setConfirmationError("");
    try {
      const response = await fetch("/api/assessment/result-publication/proofs", {
        method: "POST", headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ targetId: target, version, declaration,
          action: amendment ? "ApproveOfficialResultAmendment" : "ReleaseOfficialCourseResults",
          password: data.get("confirmation-password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Password confirmation failed.");
      const password = form.elements.namedItem("confirmation-password") as HTMLInputElement;
      password.value = "";
      await command.send(amendment ? `/amendments/${target}/approve` : `/packages/${target}/release`, { version, declaration, proof: result.proof });
    } catch (error) { setConfirmationError(error instanceof Error ? error.message : "Confirmation unavailable. Try again."); }
    finally { setConfirming(false); }
  }
  return (
    <>
      {command.error || confirmationError ? (
        <ErrorSummary
          title="Decision not confirmed"
          errors={[{ fieldId: id, message: command.error || confirmationError }]}
        />
      ) : null}
      {command.receipt ? (
        <Notice
          severity="success"
          title="Decision recorded"
          message={command.receipt}
        />
      ) : null}
      <form
        className={staffUi.form}
        aria-label={
          amendment ? "Approve result amendment" : "Release official results"
        }
        onSubmit={(event) => {
          event.preventDefault();
          void confirm(event.currentTarget);
        }}
      >
        <p>
          Reviewing version {version}.{" "}
          {amendment
            ? "Approval creates a new official version for the batch and opens academic impact reviews. Original results remain in history."
            : "Publication makes this approved batch visible to its students. Notification delivery is tracked separately."}
        </p>
        <label className={staffUi.fieldLabel} htmlFor={id}>
          <input
            id={id}
            name={id}
            type="checkbox"
            required
            disabled={confirming || command.pending || !!command.receipt}
          />{" "}
          {declaration}
        </label>
        <label className={staffUi.fieldLabel} htmlFor="confirmation-password">Confirm your password</label>
        <input className={staffUi.control} id="confirmation-password" name="confirmation-password" type="password" autoComplete="current-password" required={!command.uncertain} disabled={confirming || command.pending || !!command.receipt} maxLength={256} />
        <p>In this demonstration, password confirmation expires after two minutes and applies only to this exact decision. Production requires institutional MFA.</p>
        <button
          className={staffUi.button}
          type="submit"
          disabled={confirming || command.pending || !!command.receipt}
        >
          {confirming || command.pending
            ? "Checking publication…"
            : command.uncertain
              ? "Check using the same request reference"
              : amendment
                ? "Approve amendment"
                : "Release official results"}
        </button>
      </form>
    </>
  );
}
export function AmendmentRequestForm({
  releases,
  packages,
}: {
  releases: Array<{ id: string; offeringRef: string; periodCode: string }>;
  packages: Array<{ id: string; offeringRef: string; periodCode: string }>;
}) {
  const command = useResultCommand();
  return (
    <>
      {command.error ? (
        <ErrorSummary
          title="Amendment not confirmed"
          errors={[{ fieldId: "amendment-reason", message: command.error }]}
        />
      ) : null}
      {command.receipt ? (
        <Notice
          severity="success"
          title="Amendment requested"
          message={command.receipt}
        />
      ) : null}
      <form
        className={staffUi.form}
        aria-label="Request result amendment"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void command.send("/amendments", {
            releaseId: data.get("release"),
            packageId: data.get("package"),
            reason: data.get("reason"),
            evidenceRef: data.get("evidence"),
          });
        }}
      >
        <fieldset
          disabled={command.pending || command.uncertain || !!command.receipt}
        >
          <legend>New correction request</legend>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="amendment-release">
              Current official release
            </label>
            <br />
            <select
              className={staffUi.control}
              id="amendment-release"
              name="release"
              required
            >
              <option value="">Select a release</option>
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.offeringRef} · {r.periodCode}
                </option>
              ))}
            </select>
          </p>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="amendment-package">
              Replacement approved package
            </label>
            <br />
            <select
              className={staffUi.control}
              id="amendment-package"
              name="package"
              required
            >
              <option value="">Select a reviewed package</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.offeringRef} · {p.periodCode} · {p.id}
                </option>
              ))}
            </select>
          </p>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="amendment-reason">
              Verified correction reason
            </label>
            <br />
            <textarea
              className={staffUi.control}
              id="amendment-reason"
              name="reason"
              required
              maxLength={1000}
            />
          </p>
          <p className={staffUi.formField}>
            <label className={staffUi.fieldLabel} htmlFor="amendment-evidence">
              Review or evidence reference
            </label>
            <br />
            <input
              className={staffUi.control}
              id="amendment-evidence"
              name="evidence"
              required
              maxLength={256}
            />
          </p>
          <p>
            A separate authorized result approver must review this request.
            Requesting an amendment does not change published results.
          </p>
          <button className={staffUi.button} type="submit">
            {command.pending ? "Recording request…" : "Request amendment"}
          </button>
        </fieldset>
      </form>
      {command.uncertain ? (
        <p>
          Keep this page open.{" "}
          <button
            className={staffUi.button}
            type="button"
            disabled={command.pending}
            onClick={command.retry}
          >
            Check using the same request reference
          </button>
        </p>
      ) : null}
    </>
  );
}
