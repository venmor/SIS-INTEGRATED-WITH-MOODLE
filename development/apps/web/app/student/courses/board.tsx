"use client";

import { CourseSelection } from "./course-selection";
import workflow from "../../components/workflow.module.css";

import { academicHref } from "../../../lib/academic-context";
import { useState } from "react";
import type { CoursePlanView } from "@sis/contracts";
import { ErrorSummary, Notice } from "@sis/ui";
import styles from "../../applicant/applicant.module.css";
import study from "../study-workflows.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postPlan(
  courseCodes: string[],
  version: number,
  context: CoursePlanView,
): Promise<CoursePlanView> {
  const res = await fetch(academicHref("/api/registration/plan", context), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify({
      // New plans start at version 1; existing plans send their version.
      version: Math.max(1, version),
      idempotencyKey: crypto.randomUUID(),
      courseCodes,
    }),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { message?: string }).message ??
        "The course plan could not be saved. Check the current state before retrying.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data as CoursePlanView;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

export function PlanBoard({ initial }: { initial: CoursePlanView }) {
  const [board, setBoard] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial.items.map((i) => i.code)),
  );
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function save() {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    try {
      const saved = await postPlan([...selected], board.version, board);
      setBoard(saved);
      setSelected(new Set(saved.items.map((i) => i.code)));
      setNotice(`Draft saved as version ${saved.version}.`);
    } catch (error) {
      setErrors([{ fieldId: "course-plan", message: errorText(error) }]);
    } finally {
      setPending(false);
    }
  }

  const all = new Map(board.available.map((c) => [c.code, c]));
  for (const item of board.items) all.set(item.code, item);
  const required = [...all.values()].filter((c) => c.required);
  const electives = [...all.values()].filter((c) => !c.required);
  const savedCodes = new Set(board.items.map((item) => item.code));
  const dirty =
    selected.size !== savedCodes.size ||
    [...selected].some((code) => !savedCodes.has(code));
  const blocking = board.validation.filter(
    (check) => check.result === "BLOCK" || check.result === "APPROVAL_REQUIRED",
  );
  const warnings = board.validation.filter(
    (check) => check.result === "WARNING",
  );

  return (
    <div className={study.page} id="course-plan" tabIndex={-1}>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The plan was not saved" errors={errors} />
      ) : null}
      <section className={study.summary} aria-labelledby="course-summary-title">
        <div className={study.header}>
          <h2 id="course-summary-title">Course plan summary</h2>
          <p className={study.muted} role="status">
            {pending
              ? "Saving your draft…"
              : dirty
                ? "Unsaved changes"
                : board.planId
                  ? "Matches saved draft"
                  : "No draft saved yet"}
          </p>
        </div>
        <dl className={study.facts}>
          <div>
            <dt>Current selection</dt>
            <dd>
              <span aria-live="polite">{selected.size} courses</span>
            </dd>
          </div>
          <div>
            <dt>Last saved load</dt>
            <dd>{board.loadHalves} half-course equivalents</dd>
          </div>
          <div>
            <dt>Saved draft</dt>
            <dd>{board.planId ? `Version ${board.version}` : "Not saved"}</dd>
          </div>
        </dl>
        <p className={study.muted}>
          Save your choices to refresh the load and checks. A saved course plan
          is a draft; official registration is a separate submission.
        </p>
      </section>
      {board.notices.map((note) => (
        <p key={note} className={styles.supporting}>
          {note}
        </p>
      ))}
      <CourseSelection
        title="Required courses"
        courses={required}
        selected={selected}
        validation={board.validation}
        onToggle={toggle}
        disabled={pending}
      />
      <CourseSelection
        title="Electives"
        courses={electives}
        selected={selected}
        validation={board.validation}
        onToggle={toggle}
        disabled={pending}
      />
      <section className={study.section} aria-labelledby="saved-checks-title">
        <h2 id="saved-checks-title">Last saved checks</h2>
        <p className={study.muted}>
          {dirty
            ? "These checks apply to the saved draft. Save your changes before reviewing registration."
            : "These checks apply to the saved draft. Registration rechecks current academic and financial conditions when you submit."}
        </p>
        {board.validation.length === 0 ? (
          <p className={styles.muted}>
            No validation messages. Save a draft to validate it.
          </p>
        ) : (
          <>
            <p>
              {blocking.length} blocking or approval checks · {warnings.length}{" "}
              warnings
            </p>
            <ul className={study.checks}>
              {board.validation.map((v, index) => (
                <li key={`${v.courseId}-${v.resultCode}-${index}`}>
                  <strong>
                    {v.code} · {v.result.replaceAll("_", " ")}
                  </strong>{" "}
                  — {v.explanation}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <div className={study.footer}>
        <p className={study.muted}>
          {dirty
            ? "Your changes have not been saved. Save the course plan before moving to registration."
            : "Save a draft after changing your selection. Review readiness and registration when your saved plan is ready."}
        </p>
        <div className={study.actions}>
          <button
            className={workflow.action}
            type="button"
            disabled={pending}
            onClick={() => void save()}
          >
            {pending ? "Saving…" : "Save course plan"}
          </button>
          <a href={academicHref("/student/register", board)}>
            Review registration
          </a>
        </div>
      </div>
    </div>
  );
}
