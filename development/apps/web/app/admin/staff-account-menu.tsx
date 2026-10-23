"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NavigationIcon } from "../navigation-icon";
import styles from "./admin-shell.module.css";

/** Keeps the existing account-switch route; adds no profile service or session
 * mutation. Native disclosure works with keyboard and without JavaScript. */
export function StaffAccountMenu({ displayName }: { displayName: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        menu.current &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
      });
      if (!response.ok && response.status !== 401) throw new Error();
      window.location.replace("/sign-in");
    } catch {
      setError("We could not sign you out. Keep this device with you and try again.");
      setSigningOut(false);
    }
  }

  return (
    <details
      ref={menu}
      className={styles.accountMenu}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          event.currentTarget.open = false;
      }}
    >
      <summary className={styles.accountToggle}>
        <NavigationIcon href="/account" />
        <span>Account</span>
      </summary>
      <div className={styles.accountPanel}>
        <p className={styles.accountPanelLabel}>Current account</p>
        <strong>{displayName}</strong>
        <Link href="/sign-in">Switch account</Link>
        <button
          type="button"
          className={styles.accountSignOut}
          onClick={signOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
