import styles from "./GuidanceResult.module.css";

export interface GuidanceOutcome {
  ruleId: string;
  label: string;
  /** Applicant-entered evidence in words (never raw policy codes alone). */
  enteredText: string;
  /** Verdict in words with accessible status (19.7: colour never alone). */
  verdictText: string;
  verdictTone: "success" | "attention" | "info" | "error";
}

interface GuidanceResultProps {
  programmeName: string;
  intake: string;
  routeLabel: string;
  outcomes: GuidanceOutcome[];
  overallText: string;
  disclaimer: string;
}

/**
 * DISC-GUIDE-001 — Eligibility-guidance result (packet-local, TASK-PH2-001).
 * Server component. Per-requirement verdicts in words, overall outcome, and
 * the mandatory non-decision disclaimer (Part 2 §6.4–§6.5). Copy arrives via
 * props from DISC-* templates; this component invents no wording.
 * Full contract: packages/ui/README.md.
 */
export function GuidanceResult({
  programmeName,
  intake,
  routeLabel,
  outcomes,
  overallText,
  disclaimer,
}: GuidanceResultProps) {
  return (
    <section className={styles.result} aria-label="Eligibility guidance result">
      <h2 className={styles.title}>
        {programmeName} · {intake}
      </h2>
      <p className={styles.meta}>Qualification route: {routeLabel}</p>
      <ul className={styles.list}>
        {outcomes.map((outcome) => (
          <li
            key={outcome.ruleId}
            className={`${styles.outcome} ${styles[outcome.verdictTone] ?? ""}`}
          >
            <strong className={styles.label}>{outcome.label}</strong>
            <p className={styles.entered}>{outcome.enteredText}</p>
            <p className={styles.verdict}>{outcome.verdictText}</p>
          </li>
        ))}
      </ul>
      <p className={styles.overall} role="status">
        {overallText}
      </p>
      <p className={styles.disclaimer}>{disclaimer}</p>
    </section>
  );
}
