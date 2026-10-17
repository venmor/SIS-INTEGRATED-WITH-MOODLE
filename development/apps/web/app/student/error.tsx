"use client";

import Link from "next/link";

// student area boundary: explains, preserves, offers a safe next step.
export default function AreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <section aria-labelledby="student-error-title">
      <h1 id="student-error-title">We could not show this section</h1>
      <p>
        Something unexpected happened. Your saved work is kept — nothing was
        submitted twice by this error.
      </p>
      <p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>{" "}
        <Link href="/student">Back to student home</Link>
      </p>
    </section>
  );
}
