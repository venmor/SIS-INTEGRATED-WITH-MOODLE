// Institutional time rendering (05/05: store UTC, render Africa/Lusaka).
export function formatLusaka(input: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}
