import styles from "./ContextBar.module.css";

/**
 * UI-CONTEXT-001 — Workspace context bar. Shows the active role, scope and
 * academic period where known. Always visible for staff (constitution 19.5);
 * state is written in words so colour never carries meaning alone (19.7).
 * Server component. Full contract: packages/ui/README.md.
 */
export function ContextBar({
  role,
  scopeType,
  scopeRef,
  period,
}: {
  role: string;
  scopeType: string;
  scopeRef: string;
  period?: string;
}) {
  const context = `${role} workspace · ${scopeType}:${scopeRef}${period ? ` · ${period}` : ""}`;
  return (
    <p className={styles.bar} role="status" aria-label={`Active workspace: ${context}`}>
      <strong>{role} workspace</strong>
      {` · ${scopeType}:${scopeRef}`}
      {period ? ` · ${period}` : null}
    </p>
  );
}
