import styles from "./StatusChip.module.css";

export type StatusChipTone =
  | "neutral"
  | "info"
  | "success"
  | "attention"
  | "warning"
  | "error";

interface StatusChipProps {
  tone?: StatusChipTone;
  /** Short state text — never a bare word alone; pair with context. */
  children: React.ReactNode;
}

/**
 * Inline status chip — text-first, colour supplementary (never
 * colour-only). For full state/reason/owner/next-action blocks use
 * Status instead.
 */
export function StatusChip({ tone = "neutral", children }: StatusChipProps) {
  return (
    <span className={`${styles.chip} ${styles[tone] ?? ""}`}>{children}</span>
  );
}
