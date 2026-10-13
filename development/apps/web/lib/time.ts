// Institutional time rendering (05/05: store UTC, render Africa/Lusaka).
export function formatLusaka(input: string | Date): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
  return `${time} CAT`;
}

export function formatLusakaDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${isoDate}T10:00:00.000Z`));
}
