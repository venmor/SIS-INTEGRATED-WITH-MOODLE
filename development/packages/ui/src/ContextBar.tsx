import styles from "./ContextBar.module.css";

const roleLabels: Record<string, string> = {
  APPLICANT: "Applicant",
  APP: "Applicant",
  STUDENT: "Student",
  STU: "Student",
  ADMISSIONS_OFFICER: "Admissions officer",
  ADMISSIONS_APPROVER: "Admissions approver",
  RECORDS_OFFICER: "Records officer",
  EXAMINATIONS_OFFICER: "Examinations officer",
  FINANCE_OFFICER: "Finance officer",
  FINANCE_APPROVER: "Finance approver",
  CASHIER: "Cashier",
  LEC: "Lecturer",
  COORDINATOR: "Programme coordinator",
  MODERATOR: "Moderator",
  MOODLE_ADMIN: "Moodle administrator",
  INTEGRATION_SUPPORT: "Integration support",
  SYSADMIN: "System administrator",
};

function readableLabel(value: string): string {
  const words = value.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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
  const roleLabel = roleLabels[role] ?? readableLabel(role);
  const scopeLabel = readableLabel(scopeType);
  const context = `${roleLabel} workspace · ${scopeLabel} ${scopeRef}${period ? ` · ${period}` : ""}`;
  return (
    <p className={styles.bar} aria-label={`Active workspace: ${context}`}>
      <strong>{roleLabel} workspace</strong>
      {` · ${scopeLabel} ${scopeRef}`}
      {period ? ` · ${period}` : null}
    </p>
  );
}
