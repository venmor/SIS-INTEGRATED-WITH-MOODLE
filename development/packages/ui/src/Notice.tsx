"use client";

import { useState } from "react";
import styles from "./Notice.module.css";

export type NoticeSeverity = "info" | "success" | "attention" | "warning" | "error";

interface NoticeAction {
  label: string;
  href: string;
}

interface NoticeProps {
  severity?: NoticeSeverity;
  title: string;
  message: string;
  action?: NoticeAction;
  dismissible?: boolean;
}

const LIVE_ROLE: Record<NoticeSeverity, "status" | "alert"> = {
  info: "status",
  success: "status",
  attention: "alert",
  warning: "alert",
  error: "alert",
};

/**
 * UI-NOTICE-001 — Notification/notice.
 * Message shape follows 19.9 (what happened → means → do next).
 * Dismissal is local-only and never recorded as workflow evidence.
 * Full contract: packages/ui/README.md.
 */
export function Notice({
  severity = "info",
  title,
  message,
  action,
  dismissible = false,
}: NoticeProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <section
      className={`${styles.notice} ${styles[severity] ?? ""}`}
      role={LIVE_ROLE[severity]}
      aria-label={title}
    >
      <div>
        <strong className={styles.title}>{title}</strong>
        <p className={styles.message}>{message}</p>
        {action ? (
          <p className={styles.action}>
            <a href={action.href}>{action.label}</a>
          </p>
        ) : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          className={styles.dismiss}
          aria-label={`Dismiss: ${title}`}
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      ) : null}
    </section>
  );
}
