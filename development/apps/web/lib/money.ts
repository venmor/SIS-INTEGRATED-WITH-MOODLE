/** Money formatting for integer minor units. Components format; the
 * service calculates. Zambian conventions: ZMW with thousands separators
 * and two decimals (tambala). */
export function formatMinor(
  currency: string,
  amountMinor: number,
  locale = "en-ZM",
): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency} ${(major).toFixed(2)}`;
  }
}
