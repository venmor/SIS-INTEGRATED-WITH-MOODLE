"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { NavigationIcon } from "../navigation-icon";
import styles from "./admin-shell.module.css";

/** Keeps the existing account-switch route; adds no profile service or session
 * mutation. Native disclosure works with keyboard and without JavaScript. */
export function StaffAccountMenu({ displayName }: { displayName: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
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
      </div>
    </details>
  );
}
