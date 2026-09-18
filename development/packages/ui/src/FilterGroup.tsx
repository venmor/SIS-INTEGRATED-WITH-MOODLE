import styles from "./FilterGroup.module.css";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroupProps {
  id: string;
  label: string;
  name: string;
  options: FilterOption[];
  defaultValue?: string;
  help?: string;
}

/**
 * DISC-FILTER-001 — Labelled select filter (packet-local, TASK-PH2-001).
 * Server component: labelled control, never icon-only (Part 2 §3.1). The
 * parent form owns submission; this renders one filter with an "All" empty
 * option. Full contract: packages/ui/README.md.
 */
export function FilterGroup({
  id,
  label,
  name,
  options,
  defaultValue = "",
  help,
}: FilterGroupProps) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className={styles.group}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {help ? (
        <p className={styles.help} id={helpId}>
          {help}
        </p>
      ) : null}
      <select
        className={styles.select}
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-describedby={helpId}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
