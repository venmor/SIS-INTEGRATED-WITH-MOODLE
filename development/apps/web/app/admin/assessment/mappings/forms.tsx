"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postAssessment(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/assessment${path}`, {
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
        "The assessment service could not complete this request.",
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

// Mapping registry workspace: draft with both identifiers, synthetic
// test (writes nothing on failure). Activation lives only on the
// dedicated decision page (four-eyes); it is never inline here.
export function MappingForms() {
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
      const out = (await postAssessment(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      })) as {
        id?: string;
        result?: string;
        reasons?: string[];
        conditions?: Array<{ condition: string; passed: boolean }>;
      };
      if (out.result)
        setNotice(
          `Synthetic test ${out.result}: ${(out.conditions ?? []).map((c) => `${c.condition}=${c.passed ? "pass" : "fail"}`).join(", ")}. It writes nothing.`,
        );
      else setNotice(done);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "mapping-component", message: failure(error) }]);
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
        <ErrorSummary title="The mapping was not updated" errors={errors} />
      ) : null}
      <h2>Draft mapping</h2>
      <form
        aria-label="Draft grade mapping"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            "/mappings",
            {
              componentId: String(data.get("mapping-component") ?? ""),
              moodleActivityId: String(data.get("mapping-activity") ?? ""),
              moodleCourseRef: String(data.get("mapping-course") ?? ""),
            },
            "Mapping drafted. Run a synthetic test, then have a second officer activate it on the decision page.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="mapping-component">Component ID</label>{" "}
          <input
            id="mapping-component"
            name="mapping-component"
            type="text"
            required
          />
        </p>
        <p>
          <label htmlFor="mapping-activity">Moodle activity ID</label>{" "}
          <input
            id="mapping-activity"
            name="mapping-activity"
            type="text"
            maxLength={128}
            required
            placeholder="SIM-QUIZ-CA1"
          />
        </p>
        <p>
          <label htmlFor="mapping-course">Moodle course reference</label>{" "}
          <input
            id="mapping-course"
            name="mapping-course"
            type="text"
            maxLength={128}
            required
            placeholder="SIM-SH-SWE-2026S1"
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Drafting…" : "Draft mapping"}
          </button>
        </p>
      </form>
      <h2>Test mapping</h2>
      <form
        aria-label="Test grade mapping"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            `/mappings/${String(data.get("mapping-id") ?? "")}/test`,
            {},
            "Synthetic test recorded. It writes nothing.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="mapping-id">Mapping ID</label>{" "}
          <input id="mapping-id" name="mapping-id" type="text" required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Testing…" : "Run synthetic test"}
          </button>
        </p>
      </form>
    </>
  );
}
