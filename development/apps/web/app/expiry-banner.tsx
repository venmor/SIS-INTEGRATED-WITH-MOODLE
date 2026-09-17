"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExpiryWarningView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../lib/time";

function minutesLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  return Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - Date.now()) / 60000),
  );
}

async function getWarnings(): Promise<ExpiryWarningView[]> {
  const res = await fetch("/api/auth/workspace/expiry-warnings", {
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  return (await res.json()) as ExpiryWarningView[];
}

// Slice-5 expiry countdown (§12.12-adjacent): warns while authority still
// holds, acknowledges without interrupting the session. Silent when empty.
export function ExpiryBanner() {
  const [warnings, setWarnings] = useState<ExpiryWarningView[] | null>(null);
  const [, setTick] = useState(0);

  const refresh = useCallback(() => {
    getWarnings()
      .then(setWarnings)
      .catch(() => setWarnings([]));
  }, []);

  useEffect(() => {
    refresh();
    // Re-render twice a minute so the countdown text stays truthful.
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function acknowledge(id: string) {
    await fetch(`/api/auth/workspace/expiry-warnings/${id}/ack`, {
      method: "POST",
      headers: { "x-requested-with": "XMLHttpRequest" },
      credentials: "same-origin",
    }).catch(() => undefined);
    refresh();
  }

  if (!warnings || warnings.length === 0) return null;
  const first = warnings[0];
  const left = minutesLeft(first.endsAt);
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-label="Role assignment expiring"
      >
        <Notice
          severity="warning"
          title={`Your ${first.role} assignment expires${left !== null ? ` in about ${left} minutes` : ""}`}
          message={`Scope ${first.scopeType}:${first.scopeRef} ends ${first.endsAt ? formatLusaka(first.endsAt) : "soon"}. Finish time-sensitive work — drafts are preserved if access changes.`}
        />
      </div>
      <button
        type="button"
        aria-label={`Acknowledge expiry warning for ${first.role} in ${first.scopeRef}`}
        onClick={() => void acknowledge(first.id)}
      >
        Acknowledge
      </button>
    </>
  );
}
