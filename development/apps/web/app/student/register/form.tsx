"use client";

import { useState } from "react";
import type { CoursePlanView } from "@sis/contracts";
import { STUDENT_DEMO_V1 } from "@sis/config";
import { ErrorSummary, Notice } from "@sis/ui";
import styles from "../../applicant/applicant.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

// Formal submit: the reviewed plan version travels so concurrent edits
// conflict instead of silently submitting stale state. Every declaration
// is required; double taps are blocked with announced progress.
export function RegisterForm({ initial }: { initial: CoursePlanView }) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const declarations = STUDENT_DEMO_V1.registration
    .declarations as unknown as Array<{ key: string; text: string }>;

  async function submit(form: HTMLFormElement) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const data = new FormData(form);
      const accepted = declarations
        .filter((d) => data.get(`declaration-${d.key}`))
        .map((d) => d.key);
      const res = await fetch(`/api/registration/submit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({
          version: initial.version,
          idempotencyKey: crypto.randomUUID(),
          declarations: accepted,
        }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const out = (await res.json().catch(() => ({}))) as {
        message?: string;
        receipt?: string;
        supportReference?: string;
      };
      if (!res.ok) {
        throw new Error(
          `${out.message ?? "Registration did not complete."}${out.supportReference ? ` Support reference: ${out.supportReference}.` : ""}`,
        );
      }
      setNotice(
        `Registration completed. Receipt: ${out.receipt ?? ""} Your courses, timetable and receipt are shown above on reload.`,
      );
    } catch (error) {
      setErrors([
        {
          fieldId: "register",
          message:
            error instanceof Error
              ? error.message
              : "We could not confirm the result. Check the current state before retrying.",
        },
      ]);
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
        <ErrorSummary title="Registration did not complete" errors={errors} />
      ) : null}
      <h2>Planned courses</h2>
      <ul>
        {initial.items.map((item) => (
          <li key={item.courseId}>
            <strong>{item.code}</strong> — {item.title} ({item.credits}{" "}
            credits)
          </li>
        ))}
      </ul>
      <p className={styles.muted}>
        Planned load: {initial.loadHalves} half-course equivalents.
      </p>
      {initial.validation
        .filter((v) => v.result === "BLOCK" || v.result === "WARNING")
        .map((v, index) => (
          <p key={`${v.courseId}-${v.resultCode}-${index}`}>
            <strong>
              {v.code} · {v.result}
            </strong>{" "}
            — {v.explanation}
          </p>
        ))}
      <form
        aria-label="Submit formal registration"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(e.currentTarget);
        }}
      >
        <fieldset>
          <legend>Registration declarations (all required)</legend>
          {declarations.map((declaration) => (
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
          <button type="submit" disabled={pending}>
            {pending ? "Submitting registration…" : "Submit registration"}
          </button>
        </p>
      </form>
    </>
  );
}
