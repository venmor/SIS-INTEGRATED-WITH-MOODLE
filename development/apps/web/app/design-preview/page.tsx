import Link from "next/link";
import styles from "./preview.module.css";

const future = [
  {
    href: "/design-preview/assessment",
    title: "Assessment and official results",
    maturity: "Preview — planned v1.x",
    detail: "Validation, staging, examination authority and published-result journey.",
  },
  {
    href: "/design-preview/student-depth",
    title: "Student depth",
    maturity: "Preview — planned v1.x",
    detail: "Add/drop, progression and transcript-basis states.",
  },
  {
    href: "/design-preview/teaching-depth",
    title: "Teaching depth",
    maturity: "Preview — planned v1.x",
    detail: "Teaching calendar and grade-mapping controls.",
  },
  {
    href: "/design-preview/finance-depth",
    title: "Finance depth",
    maturity: "Preview — planned v1.x",
    detail: "Refund, reversal, sponsorship and reporting governance.",
  },
  {
    href: "/design-preview/support",
    title: "Student support",
    maturity: "Preview — planned v1.x",
    detail: "Advising and support with restricted-note privacy boundaries.",
  },
  {
    href: "/design-preview/quality",
    title: "Quality assurance",
    maturity: "Preview — planned v1.x",
    detail: "Review evidence, findings, action ownership and closure proof.",
  },
  {
    href: "/design-preview/graduation",
    title: "Graduation",
    maturity: "Operational completion target — v2.0",
    detail: "Award readiness, source integrity and verification.",
  },
  {
    href: "/design-preview/reporting",
    title: "Certified reporting",
    maturity: "Operational completion target — v2.0",
    detail: "Versioned packages, privacy suppression and signatory release.",
  },
  {
    href: "/design-preview/integrations",
    title: "Production integrations",
    maturity: "Operational completion target — v2.0",
    detail: "Provider health, credential rotation and recovery concepts.",
  },
] as const;

export default function DesignPreviewPage() {
  return (
    <main className={styles.previewMain}>
      <div className={styles.previewIntro}>
        <p className={styles.previewContext}>Handbook experience studies</p>
        <h1>Experience previews</h1>
        <p>
          Fictional visual contracts for capability that is not yet backed by
          an authoritative production domain.
        </p>
      </div>

      <section className={styles.workspaceSection} aria-labelledby="live-heading">
        <h2 id="live-heading">Current release</h2>
        <div className={styles.primaryStatus}>
          <div className={styles.statusCopy}>
            <strong>Phase 1–6 core SIS and Moodle integration</strong>
            <p>
              Identity, admissions, student registration, finance, teaching
              groups, Moodle administration and integration recovery are live.
            </p>
          </div>
          <dl className={styles.statusFacts}>
            <div>
              <dt>Maturity</dt>
              <dd>Live</dd>
            </div>
            <div>
              <dt>Preview rule</dt>
              <dd>Do not use these preview pages to claim live capability.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.workspaceSection} aria-labelledby="future-heading">
        <h2 id="future-heading">Future workspace families</h2>
        <div className={styles.previewChoices}>
          {future.map((item) => (
            <Link href={item.href} key={item.href}>
              <strong>{item.title}</strong>
              <span>{item.maturity}</span>
              <span>{item.detail}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
