// Handbook Part 2 §3.1/§3.3 availability vocabulary (words, never colour
// alone). Single source for all discovery pages — do not rephrase per page.
export function availabilityText(status: string): string {
  if (status === 'OPEN') return 'Open for applications';
  if (status === 'SOON') return 'Opens soon';
  if (status === 'RETIRED') return 'No longer offered';
  return 'Not currently open';
}
