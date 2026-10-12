"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Handbook §10 (applicant journey Part 10): focus moves to the page
 * heading after a route change. The shared target is the
 * `#main-content` landmark (every non-admin top-level main carries
 * it with `tabIndex={-1}`; the admin layout content wrapper carries
 * it for the whole admin section so page mains never duplicate the
 * id), preferring its heading; falls back to the first main, then
 * the first heading. Failed submissions focus their own error
 * summary instead (UI `ErrorSummary` behavior).
 *
 * Two subtleties, both proven by browser tests:
 * - The boot flag is module-scoped, not a ref: App Router remounts
 *   layout children on navigation, so a ref would mistake every
 *   client-side navigation for a first render and skip. Module
 *   state survives remounts within the SPA lifetime and resets on
 *   a full document load — exactly "don't steal initial focus".
 * - Content arrives after the route changes (loading boundaries):
 *   a single focus call lands on the old or loading tree and is
 *   lost on commit. Ticks repair lost focus until it settles, but
 *   never move focus the user placed themselves (activeElement
 *   inside the landmark, or any focused element still in the
 *   document, is left alone).
 */
let booted = false;

function bestTarget(): HTMLElement | null {
  // The landmark itself: plain headings are not focusable, and the
  // landmark wraps the page heading first, so screen-reader users
  // land oriented at the heading either way.
  return (
    document.getElementById("main-content") ??
    document.querySelector("main")
  );
}

function focusLost(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return true;
  if (active.closest?.("#main-content")) return false;
  if (active === document.body || active === document.documentElement)
    return true;
  // A focused node the new tree removed (e.g. a loading state).
  return !document.contains(active);
}

export function RouteFocus() {
  const pathname = usePathname();
  useEffect(() => {
    if (!booted) {
      booted = true;
      return;
    }
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    // Repair ticks across the loading→content swap; user-placed
    // focus is never touched (see focusLost).
    for (let i = 0; i < 27; i++) {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if (!focusLost()) return;
          bestTarget()?.focus({ preventScroll: true });
        }, i * 150),
      );
    }
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [pathname]);
  return null;
}
