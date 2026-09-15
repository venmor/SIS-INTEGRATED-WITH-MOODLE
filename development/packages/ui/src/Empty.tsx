import styles from "./Empty.module.css";

export type EmptyCase = "nothing" | "scoped" | "action";

interface EmptyAction {
  label: string;
  href: string;
}

interface EmptyProps {
  /** nothing = genuinely empty; scoped = hidden by role scope; action = user must act. */
  caseVariant: EmptyCase;
  title: string;
  message: string;
  action?: EmptyAction;
}

/**
 * UI-EMPTY-001 — Empty state.
 * Must distinguish the three cases above: an empty list must never look
 * like a permission denial and vice versa. Full contract: packages/ui/README.md.
 */
export function Empty({ caseVariant, title, message, action }: EmptyProps) {
  return (
    <section
      className={styles.empty}
      role="status"
      aria-label={title}
      data-case={caseVariant}
    >
      <strong className={styles.title}>{title}</strong>
      <p className={styles.message}>{message}</p>
      {action ? (
        <p className={styles.action}>
          <a href={action.href}>{action.label}</a>
        </p>
      ) : null}
    </section>
  );
}
