"use client";
import { useState } from "react";
import { ActionButton } from "@sis/ui";

export function ApplicantSignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true);
    setError("");
    try {
      const result = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
      });
      if (!result.ok && result.status !== 401) throw new Error();
      // Full navigation removes applicant data from the client router cache.
      window.location.replace("/sign-in");
    } catch {
      setError(
        "We could not sign you out. Keep this device with you and try again.",
      );
      setPending(false);
    }
  }
  return (
    <div>
      <ActionButton
        type="button"
        kind="tertiary"
        onClick={signOut}
        pending={pending}
        loadingText="Signing out…"
      >
        Sign out
      </ActionButton>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
