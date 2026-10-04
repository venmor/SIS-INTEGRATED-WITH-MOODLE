# ADR-003: Add Tailwind utilities to the web UI

- Status: User-directed implementation; human design review pending
- Date: 2026-10-02
- Decision owner: Charles Hangoma
- Scope: v2.0 web presentation layer

## Context

The user found the current SIS interface too basic and asked for Tailwind CSS, useful micro-interactions and a modern workflow UI. The initial v2 plan named CSS Modules as the existing baseline. The approved UI constitution still controls hierarchy, semantic status, accessibility, restrained motion and data density. The proposed palette in `@sis/ui/tokens.css` is not institutional brand approval.

## Decision

Add Tailwind CSS v4 to the Next.js web workspace as an additive utility layer. Import theme and utilities, but omit Tailwind Preflight so existing pages and shared component styles retain their base behavior. Map semantic Tailwind colors, radius and shadow to the existing UI tokens with `@theme inline`; do not create an independent brand palette. CSS Modules remain available for existing components and complex state styling. Apply Tailwind incrementally by workflow family, starting with the applicant portal and document step. Motion communicates hover, focus, transfer and saved/processing states, respects reduced-motion preference, and never implies a server action completed before its receipt.

The existing universal margin/padding reset belongs in the CSS `base` layer. Leaving it unlayered overrides Tailwind utilities and strips card/form spacing at runtime, despite successful builds. This was found with a computed-style browser assertion in the academic-support queue slice.

## Consequences and checks

The web workspace gains `tailwindcss`, `@tailwindcss/postcss` and `postcss` as build dependencies. Existing screens require visual regression checks during migration because utilities and unlayered CSS Modules can have different cascade precedence; avoid mixing competing declarations on the same element. Run build, typecheck, lint and connected browser journeys, including 390px layout, keyboard focus and upload progress. This ADR changes UI implementation technology only; it approves no institutional policy, applicant document, Moodle or production provider.
