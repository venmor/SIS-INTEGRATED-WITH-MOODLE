"use client";

import { useState } from "react";
import { Notice } from "@sis/ui";
import type { MOODLE_LIVE_V1 } from "@sis/config";

/** Backend labels this page may render. Derived from the one
 * authoritative mode list in `@sis/config` so that renaming a mode is a
 * compile error here rather than a wrong label in a browser. The API's
 * `MoodleBackend` type is deliberately not imported: it lives in
 * `apps/api/src/integration/moodle-adapter.ts`, a server module that the
 * web app must not depend on. */
type ConnectionBackend = (typeof MOODLE_LIVE_V1.modes)[number];

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

// Connection validation: reports backend, reachability and version.
// Simulator answers locally; live performs a real version call.
// Secrets never leave the server either way.
export function ConnectionValidate() {
  const [result, setResult] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function validate() {
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const out = (await postIntegration("/connection/validate", {})) as {
        ok?: boolean;
        backend?: ConnectionBackend;
        version?: string | null;
        detail?: string;
      };
      setResult(
        `${out.backend === "live-test" ? "Live" : "Simulator"}: ${out.detail ?? ""}${out.version ? ` (version ${out.version})` : ""}`,
      );
    } catch (error) {
      setResult(
        error instanceof Error ? error.message : "Validation did not complete.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <p>
        <button type="button" disabled={pending} onClick={() => void validate()}>
          {pending ? "Checking…" : "Test connection"}
        </button>
      </p>
      {result ? (
        <Notice severity="info" title="Connection check" message={result} />
      ) : null}
    </>
  );
}
