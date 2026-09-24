"use client";

import { useState } from "react";
import type { OnboardingTaskView } from "@sis/contracts";
import { ActionButton, ErrorSummary, Notice } from "@sis/ui";
import { applicantRequest, errorMessage } from "../../api";

// Applicant-owned tasks complete here with a fresh idempotency key per
// attempt. Institution-owned tasks render their owner instead of a control.
export function OnboardingTasks({
  applicationId,
  initial,
}: {
  applicationId: string;
  initial: OnboardingTaskView[];
}) {
  const [tasks, setTasks] = useState(initial);
  const [errors, setErrors] = useState<Array<{ fieldId: string; message: string }>>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const required = tasks.filter((t) => t.required);
  const requiredComplete = required.filter(
    (t) => t.status === "COMPLETED",
  ).length;

  async function refresh() {
    try {
      const board = await applicantRequest<{
        tasks: OnboardingTaskView[];
      }>(`/${applicationId}/onboarding`);
      setTasks(board.tasks);
    } catch {
      // Best-effort: the success notice already confirms the write.
    }
  }

  async function complete(taskKey: string) {
    if (pending) return;
    setPending(taskKey);
    setErrors([]);
    setNotice(null);
    try {
      const timeline = await applicantRequest<{ version: number }>(
        `/${applicationId}/timeline`,
      );
      await applicantRequest(`/${applicationId}/onboarding/tasks`, {
        version: timeline.version,
        idempotencyKey: crypto.randomUUID(),
        taskKey,
      });
      await refresh();
      setNotice("Task completed.");
    } catch (error) {
      setErrors([{ fieldId: taskKey, message: errorMessage(error) }]);
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
        <ErrorSummary title="The task was not completed" errors={errors} />
      ) : null}
      <p>
        {requiredComplete} of {required.length} required tasks complete.
      </p>
      <ul>
        {tasks.map((task) => (
          <li key={task.taskKey}>
            <strong>{task.title}</strong> —{" "}
            {task.required ? "Required" : "Optional"} · {task.status} ·{" "}
            {task.owner === "APPLICANT" ? "You" : "Admissions"}
            {task.status === "COMPLETED" ? null : task.owner ===
              "APPLICANT" ? (
              <p>
                <ActionButton
                  type="button"
                  kind="secondary"
                  pending={pending === task.taskKey}
                  loadingText="Marking complete…"
                  disabled={pending !== null}
                  aria-label={`Mark task as complete: ${task.title}`}
                  onClick={() => void complete(task.taskKey)}
                >
                  Mark complete
                </ActionButton>
              </p>
            ) : (
              <p>Verification in progress — no action required.</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
