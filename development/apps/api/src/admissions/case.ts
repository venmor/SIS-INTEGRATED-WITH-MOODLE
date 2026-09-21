import type { ApplicationStatusEvent } from '@sis/contracts';

// Post-submit case helpers (Part 9). Staff-only rows (applicantVisible=false)
// never reach applicant views — internal assignment, notes, fraud signals
// stay out by construction, not by view discipline.
export function visibleTimeline(
  events: ApplicationStatusEvent[],
): ApplicationStatusEvent[] {
  return events
    .filter((event) => event.applicantVisible)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}
