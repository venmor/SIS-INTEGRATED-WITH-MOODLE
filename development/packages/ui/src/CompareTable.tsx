import styles from "./CompareTable.module.css";

export interface CompareColumn {
  heading: string;
  offeringId: string;
  awardLevel: string;
  duration: string;
  campusMode: string;
  statusText: string;
  deadlineText: string | null;
  requirementsText: string;
  additionalText: string | null;
  versionText: string;
  feeRef: string;
  removeHref: string;
  removeLabel: string;
}

interface CompareTableProps {
  columns: CompareColumn[];
  limitNote: string | null;
}

/**
 * DISC-COMPARE-001 — Programme comparison table (packet-local, TASK-PH2-001).
 * Server component. Differences only, never ranked or recommended (Part 2
 * §5). Stacks to labelled rows on narrow screens (19.3: tables become record
 * cards; no workflow requires horizontal scrolling).
 * Full contract: packages/ui/README.md.
 */
export function CompareTable({ columns, limitNote }: CompareTableProps) {
  return (
    <div className={styles.wrap}>
      {limitNote ? (
        <p className={styles.note} role="status">
          {limitNote}
        </p>
      ) : null}
      <table className={styles.table}>
        <caption className={styles.caption}>
          Programme comparison. Differences only; no programme is ranked.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span className={styles.srOnly}>Field</span>
            </th>
            {columns.map((column) => (
              <th key={column.heading} scope="col" className={styles.head}>
                {column.heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Award level</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Award level">
                {column.awardLevel}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Duration</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Duration">
                {column.duration}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Campus and mode</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Campus and mode">
                {column.campusMode}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Intake status</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Intake status">
                {column.statusText}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Deadline</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Deadline">
                {column.deadlineText ?? "Not published"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Core entry requirements</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Core entry requirements">
                {column.requirementsText}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Additional selection requirements</th>
            {columns.map((column) => (
              <td
                key={column.heading}
                data-label="Additional selection requirements"
              >
                {column.additionalText ?? "None listed"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Requirements version</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Requirements version">
                {column.versionText}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Fee schedule</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Fee schedule">
                {column.feeRef}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Actions</th>
            {columns.map((column) => (
              <td key={column.heading} data-label="Actions">
                <a
                  className={styles.action}
                  href={`/discover/${column.offeringId}`}
                  aria-label={`View ${column.heading}`}
                >
                  View programme
                </a>{" "}
                <a
                  className={styles.action}
                  href={`/discover/${column.offeringId}/eligibility`}
                  aria-label={`Check eligibility for ${column.heading}`}
                >
                  Check eligibility
                </a>{" "}
                <a className={styles.action} href={column.removeHref}>
                  {column.removeLabel}
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
