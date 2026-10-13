"use client";

import { CourseSummary } from "../../components/task-flow";
import workflow from "../../components/workflow.module.css";

import { useEffect, useState } from "react";
import type {
  CoursePlanView,
  RegistrationReceiptView,
  RegistrationStatusView,
} from "@sis/contracts";
import { STUDENT_DEMO_V1 } from "@sis/config";
import { ErrorSummary, Notice } from "@sis/ui";
import { academicHref } from "../../../lib/academic-context";
import styles from "../../applicant/applicant.module.css";

const declarations = STUDENT_DEMO_V1.registration
  .declarations as unknown as Array<{ key: string; text: string }>;

type Command = {
  version: number;
  idempotencyKey: string;
  declarations: string[];
};
export function RegisterForm({
  initial,
  recoveryScope,
}: {
  initial: CoursePlanView;
  recoveryScope: string;
}) {
  const [errors, setErrors] = useState<
    Array<{ fieldId: string; message: string }>
  >([]);
  const [pending, setPending] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const storageKey = `sis-registration-command:${recoveryScope}`;
  const [accepted, setAccepted] = useState<string[]>([]);
  const [command, setCommand] = useState<Command | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [checked, setChecked] = useState(false);
  const [receipt, setReceipt] = useState<RegistrationReceiptView | null>(null);
  const bands = STUDENT_DEMO_V1.loadBands;
  const empty =
    !initial.planId || initial.version < 1 || initial.items.length === 0;
  const blocked = initial.validation.filter(
    (v) => v.result === "BLOCK" || v.result === "APPROVAL_REQUIRED",
  );
  const invalidLoad =
    initial.loadHalves < bands.minHalves ||
    initial.loadHalves > bands.maxHalves;
  const canSubmit =
    !empty &&
    initial.status === "DRAFT" &&
    blocked.length === 0 &&
    !invalidLoad;

  useEffect(() => {
    // Hydrate browser-only recovery after SSR; submission stays disabled until checked.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Command;
        if (
          !Number.isInteger(parsed.version) ||
          parsed.version < 1 ||
          typeof parsed.idempotencyKey !== "string" ||
          !/^[a-f0-9-]{36}$/i.test(parsed.idempotencyKey) ||
          !Array.isArray(parsed.declarations) ||
          parsed.declarations.some(
            (key) => !declarations.some((d) => d.key === key),
          )
        )
          throw new Error("Invalid saved command");
        setCommand(parsed);
        setUncertain(true);
      }
      setRecoveryReady(true);
    } catch {
      setErrors([
        {
          fieldId: "register",
          message:
            "Submission recovery is unavailable. Check your registration status before continuing.",
        },
      ]);
    }
    // The recovery scope changes only with the authenticated session and selected study context.
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storageKey]);
  useEffect(() => {
    if (!pending && !uncertain) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigation = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("a[href]"))
        event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", navigation, true);
    };
  }, [pending, uncertain]);

  async function submit(existing?: Command) {
    if (
      pending ||
      !recoveryReady ||
      !canSubmit ||
      (!existing && (uncertain || accepted.length !== declarations.length))
    )
      return;
    const payload = existing ?? {
      version: initial.version,
      idempotencyKey: crypto.randomUUID(),
      declarations: accepted,
    };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      setErrors([
        {
          fieldId: "register",
          message:
            "We cannot safely retain this submission for recovery. Check browser storage before submitting.",
        },
      ]);
      return;
    }
    setCommand(payload);
    setPending(true);
    setErrors([]);
    setChecked(false);
    try {
      const response = await fetch(
        academicHref("/api/registration/submit", initial),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify(payload),
          credentials: "same-origin",
          cache: "no-store",
        },
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status >= 500 || existing) setUncertain(true);
        else {
          setUncertain(false);
          setCommand(null);
          sessionStorage.removeItem(storageKey);
        }
        setErrors([
          {
            fieldId: "register",
            message:
              typeof result.message === "string"
                ? result.message
                : "Registration did not complete.",
          },
        ]);
        return;
      }
      if (
        !result.receipt ||
        result.attemptId !== initial.attemptId ||
        result.period !== initial.period
      )
        throw new Error("The registration receipt could not be confirmed.");
      sessionStorage.removeItem(storageKey);
      setReceipt(result);
      setUncertain(false);
    } catch (error) {
      // Network/parse failures may occur after the server committed the command.
      setUncertain(true);
      setErrors([
        {
          fieldId: "register",
          message:
            error instanceof Error
              ? error.message
              : "Check your registration status before retrying.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }
  async function checkStatus() {
    if (pending) return;
    setPending(true);
    setErrors([]);
    try {
      const response = await fetch(
        academicHref("/api/registration/status", initial),
        { cache: "no-store", credentials: "same-origin" },
      );
      if (!response.ok)
        throw new Error(
          "Registration status is unavailable. Keep this page open and try checking again.",
        );
      const result = (await response.json()) as RegistrationStatusView;
      if (result.registration) {
        if (
          result.registration.attemptId !== initial.attemptId ||
          result.registration.period !== initial.period
        )
          throw new Error("The registration context could not be confirmed.");
        sessionStorage.removeItem(storageKey);
        setReceipt(result.registration);
        setUncertain(false);
      } else setChecked(true);
    } catch (error) {
      setErrors([
        {
          fieldId: "register",
          message:
            error instanceof Error
              ? error.message
              : "Registration status is unavailable.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }
  if (receipt)
    return (
      <>
        <Notice
          severity="success"
          title="Registration completed"
          message={`Receipt ${receipt.receipt}. Your official course registration is complete.`}
        />
        <CourseSummary
          courses={receipt.courses}
          caption="Officially registered courses"
        />
        <p>
          <a className={workflow.action} href={academicHref("/student/timetable", initial)}>
            View timetable
          </a>
        </p>
      </>
    );
  return (
    <>
      {errors.length > 0 && (
        <ErrorSummary title="Registration did not complete" errors={errors} />
      )}
      {empty ? (
        <>
          <h2>Choose your courses first</h2>
          <p>Save a course plan before reviewing registration.</p>
          <a href={academicHref("/student/courses", initial)}>
            Plan your courses
          </a>
        </>
      ) : (
        <>
          <h2>Planned courses</h2>
          <CourseSummary
            courses={initial.items}
            caption={`${initial.items.length} selected courses · ${initial.period}`}
          />
          <p className={styles.muted}>
            Planned load: {initial.loadHalves} half-course equivalents.
            {invalidLoad
              ? ` Choose ${bands.minHalves} to ${bands.maxHalves} before submitting.`
              : ""}
          </p>
          {initial.validation
            .filter((v) => v.result !== "PASS")
            .map((v, i) => (
              <p key={i} className={workflow.panel}>
                <strong>
                  {v.code} · {v.result}
                </strong>{" "}
                — {v.explanation}
              </p>
            ))}
          {!canSubmit && (
            <>
              <h2>Fix your course plan</h2>
              <p>Resolve the issues above before registration.</p>
              <a href={academicHref("/student/courses", initial)}>
                Edit course plan
              </a>
            </>
          )}
        </>
      )}
      {uncertain ? (
        <>
          <Notice
            severity="warning"
            title="Registration confirmation pending"
            message="Keep this page open. Check your status before retrying the same submission."
          />
          <button
            className={workflow.action}
            disabled={pending}
            onClick={() => void checkStatus()}
          >
            Check registration status
          </button>
          {checked && command && (
            <button
              className={workflow.action}
              disabled={pending}
              onClick={() => void submit(command)}
            >
              Retry same submission
            </button>
          )}
        </>
      ) : (
        canSubmit && (
          <form
            aria-label="Submit formal registration"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={pending} className={workflow.declarations}>
              <legend>Registration declarations (all required)</legend>
              {declarations.map((d) => (
                <p key={d.key}>
                  <label className={workflow.check}>
                    <input
                      type="checkbox"
                      required
                      checked={accepted.includes(d.key)}
                      onChange={(e) =>
                        setAccepted((previous) =>
                          e.target.checked
                            ? [...previous, d.key]
                            : previous.filter((key) => key !== d.key),
                        )
                      }
                    />{" "}
                    {d.text}
                  </label>
                </p>
              ))}
            </fieldset>
            <button
              className={workflow.action}
              disabled={
                !recoveryReady ||
                pending ||
                accepted.length !== declarations.length
              }
            >
              {pending ? "Submitting registration…" : "Submit registration"}
            </button>
          </form>
        )
      )}
    </>
  );
}
