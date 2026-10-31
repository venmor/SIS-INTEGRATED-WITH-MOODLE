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
import study from "../study-workflows.module.css";
import { RegistrationReceipt } from "./receipt";

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
  // Everything that is neither a pass nor a hard block is advisory: the
  // service deliberately keeps required-but-missing courses non-blocking
  // because registration is per period. Keep that distinction visible so a
  // warning never reads like a deadlock.
  const advisories = initial.validation.filter(
    (v) => v.result !== "PASS" && v.result !== "BLOCK" && v.result !== "APPROVAL_REQUIRED",
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
  if (receipt) return <RegistrationReceipt receipt={receipt} />;
  return (
    <div className={study.page} id="register" tabIndex={-1}>
      {errors.length > 0 && (
        <ErrorSummary title="Registration did not complete" errors={errors} />
      )}
      {empty ? (
        <section className={study.section}>
          <h2>Choose your courses first</h2>
          <p>Save a course plan before reviewing registration.</p>
          <a href={academicHref("/student/courses", initial)}>
            Plan your courses
          </a>
        </section>
      ) : (
        <>
          <section
            className={study.section}
            aria-labelledby="planned-courses-title"
          >
            <h2 id="planned-courses-title">Planned courses</h2>
            <CourseSummary
              courses={initial.items}
              caption={`${initial.items.length} selected courses · ${initial.period}`}
            />
            <dl className={study.facts}>
              <div>
                <dt>Academic period</dt>
                <dd>{initial.period}</dd>
              </div>
              <div>
                <dt>Saved plan</dt>
                <dd>Version {initial.version}</dd>
              </div>
              <div>
                <dt>Planned load</dt>
                <dd>{initial.loadHalves} half-course equivalents</dd>
              </div>
            </dl>
          </section>
          <section
            className={study.section}
            aria-labelledby="registration-checks-title"
          >
            <h2 id="registration-checks-title">Before you submit</h2>
            <p className={study.muted}>
              Review the saved plan checks below. The service checks current
              readiness, financial clearance, holds and course availability
              again when you submit.
            </p>
            <ul className={study.checks}>
              <li>
                <span className={study.checkLabel}>Course-plan status</span>
                <span>
                  {initial.status === "DRAFT"
                    ? "Saved draft ready for review"
                    : `A draft is required. Current state: ${initial.status.replaceAll("_", " ")}.`}
                </span>
              </li>
              <li>
                <span className={study.checkLabel}>Academic load</span>
                <span>
                  {invalidLoad
                    ? `Your saved load is ${initial.loadHalves} half-course equivalents — choose ${bands.minHalves} to ${bands.maxHalves} half-course equivalents before submitting.`
                    : `${initial.loadHalves} half-course equivalents is within the configured demonstration range.`}
                </span>
              </li>
            </ul>
            {(invalidLoad || blocked.length > 0) && (
              <>
                <h3>Blocking issues</h3>
                <p className={study.muted}>
                  Registration cannot be submitted until these are resolved.
                </p>
                <ul className={study.checks}>
                  {invalidLoad && (
                    <li>
                      <span className={study.checkLabel}>Academic load</span>
                      <span className={study.checkDetail}>
                        Keep between {bands.minHalves} and {bands.maxHalves}{" "}
                        half-course equivalents in this plan.
                      </span>
                    </li>
                  )}
                  {blocked.map((v, i) => (
                    <li key={`${v.code}-${v.resultCode}-${i}`}>
                      <span className={study.checkLabel}>
                        {v.code} · {v.result.replaceAll("_", " ")}
                      </span>
                      <span className={study.checkDetail}>{v.explanation}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {advisories.length > 0 && (
              <>
                <h3>Advisory checks</h3>
                <p className={study.muted}>
                  These do not block submission. When no blocking issues are
                  shown above, you can submit this plan.
                </p>
                <ul className={study.checks}>
                  {advisories.map((v, i) => (
                    <li key={`${v.code}-${v.resultCode}-${i}`}>
                      <span className={study.checkLabel}>
                        {v.code} · {v.result.replaceAll("_", " ")}
                      </span>
                      <span className={study.checkDetail}>{v.explanation}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!canSubmit && (
              <>
                <h3>Fix your course plan</h3>
                <p>Resolve the issues above before registration.</p>
                <a href={academicHref("/student/courses", initial)}>
                  Edit course plan
                </a>
              </>
            )}
            <div className={study.actions}>
              <a href={academicHref("/student/readiness", initial)}>
                Check registration readiness
              </a>
            </div>
          </section>
        </>
      )}
      {uncertain ? (
        <section
          className={study.section}
          aria-label="Recover registration confirmation"
        >
          <Notice
            severity="warning"
            title="Registration confirmation pending"
            message="Keep this page open. Check your status before retrying the same submission."
          />
          <div className={study.actions}>
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
          </div>
        </section>
      ) : (
        canSubmit && (
          <form
            className={study.form}
            aria-label="Submit formal registration"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={pending} className={workflow.declarations}>
              <legend>Registration declarations (all required)</legend>
              <p className={study.muted}>
                Review each declaration before submitting this saved course
                plan. Submission creates your official registration if all
                current checks pass.
              </p>
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
            <div className={study.footer}>
              <p className={study.muted} role="status">
                {!recoveryReady
                  ? "Checking safe submission recovery…"
                  : pending
                    ? "Keep this page open while registration is confirmed."
                    : accepted.length !== declarations.length
                      ? `Accept all ${declarations.length} declarations to enable submission. ${accepted.length} accepted.`
                      : "All declarations accepted. You can submit this course plan for registration."}
              </p>
              <div className={study.actions}>
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
              </div>
            </div>
          </form>
        )
      )}
    </div>
  );
}
