import styles from "./ProgrammeCard.module.css";

interface ProgrammeCardProps {
  name: string;
  awardLevel: string;
  school: string;
  duration: string;
  campus: string;
  studyMode: string;
  /** Always text (19.7: colour never carries meaning alone). */
  availabilityText: string;
  deadlineText: string | null;
  requirementSummary: string;
  statusNote: string | null;
  viewHref: string;
  /** "Add" links to the tray-adding URL; "Added" links to the compare page. */
  compareHref: string;
  compareSelected: boolean;
}

/**
 * DISC-CARD-001 — Programme search-result record.
 * Factual catalogue information with explicit view and compare actions.
 */
export function ProgrammeCard({
  name,
  awardLevel,
  school,
  duration,
  campus,
  studyMode,
  availabilityText,
  deadlineText,
  requirementSummary,
  statusNote,
  viewHref,
  compareHref,
  compareSelected,
}: ProgrammeCardProps) {
  return (
    <article className={styles.card} aria-label={name}>
      <h3 className={styles.name}>
        <a className={styles.link} href={viewHref} aria-label={`View ${name}`}>
          {name}
        </a>
      </h3>
      <p className={styles.facts}>
        {awardLevel} · {school}
      </p>
      <p className={styles.facts}>
        {studyMode} · {campus} · {duration}
      </p>
      <p className={styles.availability}>{availabilityText}</p>
      {deadlineText ? <p className={styles.meta}>{deadlineText}</p> : null}
      {requirementSummary ? (
        <p className={styles.meta}>{requirementSummary}</p>
      ) : null}
      {statusNote ? <p className={styles.note}>{statusNote}</p> : null}
      <div className={styles.actions}>
        <a className={styles.primaryAction} href={viewHref}>
          View programme
        </a>
        <a
          className={styles.secondaryAction}
          href={compareHref}
          aria-label={
            compareSelected
              ? `${name} added to comparison. View comparison.`
              : `Add ${name} to comparison`
          }
        >
          {compareSelected ? "Added to comparison" : "Compare"}
        </a>
      </div>
    </article>
  );
}
