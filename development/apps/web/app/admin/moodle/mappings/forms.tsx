"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postIntegration(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/integration${path}`, {
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
        "The integration service could not complete this request.",
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
// test, four-eyes activation. Tests never write mappings.
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
      await postIntegration(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "mapping-kind", message: failure(error) }]);
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
        aria-label="Draft Moodle mapping"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            "/mappings",
            {
              kind: String(data.get("mapping-kind") ?? ""),
              sisType: String(data.get("mapping-sis-type") ?? ""),
              sisId: String(data.get("mapping-sis-id") ?? ""),
              moodleId: String(data.get("mapping-moodle-id") ?? ""),
            },
            "Mapping drafted. Run a synthetic test, then have a second officer activate it.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="mapping-kind">Kind</label>{" "}
          <select id="mapping-kind" name="mapping-kind" required>
            <option value="">Choose…</option>
            <option value="SHELL">Course shell</option>
            <option value="USER">User</option>
            <option value="ROLE">Role</option>
            <option value="GROUP">Tutorial group</option>
            <option value="SECTION">Section</option>
          </select>
        </p>
        <p>
          <label htmlFor="mapping-sis-type">SIS type</label>{" "}
          <input id="mapping-sis-type" name="mapping-sis-type" type="text" maxLength={64} required />
        </p>
        <p>
          <label htmlFor="mapping-sis-id">SIS identifier</label>{" "}
          <input id="mapping-sis-id" name="mapping-sis-id" type="text" maxLength={128} required />
        </p>
        <p>
          <label htmlFor="mapping-moodle-id">Moodle identifier</label>{" "}
          <input
            id="mapping-moodle-id"
            name="mapping-moodle-id"
            type="text"
            maxLength={128}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Drafting…" : "Draft mapping"}
          </button>
        </p>
      </form>
      <h2>Test and activate</h2>
      <form
        aria-label="Test Moodle mapping"
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
      <form
        aria-label="Activate Moodle mapping"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            `/mappings/${String(data.get("activate-id") ?? "")}/activate`,
            {},
            "Mapping activated. A second officer must do this; creators cannot self-activate.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="activate-id">Mapping ID</label>{" "}
          <input id="activate-id" name="activate-id" type="text" required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Activating…" : "Activate mapping"}
          </button>
        </p>
      </form>
    </>
  );
}
