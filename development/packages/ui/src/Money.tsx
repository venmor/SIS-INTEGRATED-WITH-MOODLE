import styles from "./Money.module.css";

interface MoneyProps {
  /** ISO currency code, always shown. */
  currency: string;
  /** Integer minor units (tambala); components never calculate. */
  amountMinor: number;
  locale?: string;
}

/**
 * Money display — currency always shown, tabular figures, Zambian
 * formatting. Formatting only; all math stays server-side.
 */
export function Money({ currency, amountMinor, locale = "en-ZM" }: MoneyProps) {
  let text: string;
  try {
    text = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    text = `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
  return <span className={styles.money}>{text}</span>;
}
