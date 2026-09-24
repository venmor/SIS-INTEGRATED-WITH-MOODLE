import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  /** Workspace/context line, e.g. "Finance and clearance · 2026S1". */
  eyebrow: string;
  /** Page title in sentence case — the page's one primary goal. */
  title: string;
  /** One-sentence purpose answering "what do I need to do now?". */
  lede?: string;
}

/**
 * Page header — workspace context, title, purpose. Answers "where am
 * I, what is happening, what do I need to do now" before any task.
 */
export function PageHeader({ eyebrow, title, lede }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      {lede ? <p className={styles.lede}>{lede}</p> : null}
    </header>
  );
}
