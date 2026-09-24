import styles from "./DataTable.module.css";
export interface DataColumn<T> {
  /** Column heading in sentence case. */
  heading: string;
  /** Right-align figures; left-align everything else. */
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  /** Table title naming the measure and scope. */
  title: string;
  /** Plain-language description of what the rows compare. */
  description?: string;
  columns: Array<DataColumn<T>>;
  rows: ReadonlyArray<T>;
  keyOf: (row: T, index: number) => string;
  /** Text shown when there are no rows (never implies success on failure). */
  emptyText: string;
  /** Hide the visible title (e.g. nested in a Card carrying the title). */
  hideTitle?: boolean;
}

/**
 * UI-TABLE-001 — governed data table. Desktop renders a real table;
 * narrow screens render labelled record cards (no horizontal scroll,
 * no hover-only actions). Server component.
 */
export function DataTable<T>({
  title,
  description,
  columns,
  rows,
  keyOf,
  emptyText,
  hideTitle,
}: DataTableProps<T>) {
  return (
    <section className={styles.dataTable} aria-label={title}>
      <h2
        className={hideTitle ? styles.visuallyHidden : styles.dataTableTitle}
      >
        {title}
      </h2>
      {description ? <p className={styles.dataTableDescription}>{description}</p> : null}
      {rows.length === 0 ? (
        <p className={styles.dataTableEmpty}>{emptyText}</p>
      ) : (
        <>
          <div className={styles.dataTableScroll}>
            <table className={styles.dataTableTable}>
              <caption className={styles.dataTableCaption}>
                {title}
                {description ? ` — ${description}` : ""}
              </caption>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.heading}
                      scope="col"
                      className={
                        column.numeric
                          ? styles.dataTableNumeric
                          : styles.dataTableText
                      }
                    >
                      {column.heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={keyOf(row, index)} className={styles.dataTableRow}>
                    {columns.map((column) => (
                      <td
                        key={column.heading}
                        data-heading={column.heading}
                        className={
                          column.numeric
                            ? styles.dataTableNumeric
                            : styles.dataTableText
                        }
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={styles.dataTableCards}>
            {rows.map((row, index) => (
              <li key={keyOf(row, index)} className={styles.dataTableCard}>
                {columns.map((column) => (
                  <p key={column.heading} className={styles.dataTableCardRow}>
                    <span className={styles.dataTableCardHeading}>
                      {column.heading}
                    </span>{" "}
                    <span className={styles.dataTableCardValue}>
                      {column.render(row)}
                    </span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
