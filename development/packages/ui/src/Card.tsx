import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  /** Card title in sentence case. */
  title?: string;
  children: ReactNode;
}

/**
 * UI card — groups genuinely separate records, decisions or tasks
 * (never nested for looks, never decorative). Server component.
 */
export function Card({ title, children }: CardProps) {
  return (
    <section className={styles.card}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
