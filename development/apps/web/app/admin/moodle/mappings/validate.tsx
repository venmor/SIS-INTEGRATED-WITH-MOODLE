"use client";

import { useState } from "react";
import { Notice } from "@sis/ui";

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
  const [result, setResult] = useState<{
    message: string;
    severity: "success" | "warning";
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function validate() {
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const out = (await postIntegration("/connection/validate", {})) as {
        ok?: boolean;
        backend?: string;
        version?: string | null;
        detail?: string;
      };
      setResult({
        severity: out.ok === true ? "success" : "warning",
        message: `${out.backend === "live" ? "Live" : "Simulator"}: ${out.detail ?? ""}${out.version ? ` (version ${out.version})` : ""}`,
      });
    } catch (error) {
      setResult({
        severity: "warning",
        message:
          error instanceof Error ? error.message : "Validation did not complete.",
      });
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
        <Notice
          severity={result.severity}
          title={
            result.severity === "success"
              ? "Connection confirmed"
              : "Connection needs attention"
          }
          message={result.message}
        />
      ) : null}
    </>
  );
}
