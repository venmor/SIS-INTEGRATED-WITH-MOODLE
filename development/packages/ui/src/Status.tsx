import styles from "./Status.module.css";

export type StatusSeverity =
  | "neutral"
  | "info"
  | "success"
  | "attention"
  | "warning"
  | "error";

interface StatusProps {
  severity?: StatusSeverity;
  /** Current state in plain words (19.10: never a bare word like "Pending"). */
  state: string;
  reason?: string;
  updated?: string;
  owner?: string;
  action?: string;
}

/**
 * UI-STATUS-001 — Status explanation.
 * Server component. Colour reinforces the written state; it never carries
 * meaning alone (19.7). Full contract: packages/ui/README.md.
 */
export function Status({
  severity = "neutral",
  state,
  reason,
  updated,
  owner,
  action,
}: StatusProps) {
  return (
    <section
      className={`${styles.status} ${styles[severity] ?? ""}`}
      role="status"
      aria-label={state}
    >
      <strong className={styles.state}>{state}</strong>
      {reason ? <p className={styles.reason}>{reason}</p> : null}
      {updated ? (
        <p className={styles.meta}>
          Last updated: <time>{updated}</time>
        </p>
      ) : null}
      {owner ? <p className={styles.meta}>Owner: {owner}</p> : null}
      {action ? <p className={styles.next}>{action}</p> : null}
    </section>
  );
}
