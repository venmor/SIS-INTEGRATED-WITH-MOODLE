"use client";

export function SkipToMain() {
  return (
    <a
      className="globalSkip"
      href="#main-content"
      onClick={() => {
        requestAnimationFrame(() => document.getElementById("main-content")?.focus());
      }}
    >
      Skip to main content
    </a>
  );
}
