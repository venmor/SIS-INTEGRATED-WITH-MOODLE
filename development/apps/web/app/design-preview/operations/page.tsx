import Link from "next/link";
import { operationsPreview } from "../data";
import styles from "../preview.module.css";

export default function OperationsPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Integration Support workspace · {operationsPreview.environment}
        </p>
        <h1>Operations</h1>
      </header>

      <section
        className={styles.workspaceSection}
        aria-labelledby="needs-attention-heading"
      >
        <h2 id="needs-attention-heading">Needs attention</h2>
        <ul className={styles.opsList}>
          {operationsPreview.attention.map((item) => (
            <li key={item.title}>
              <div className={styles.opsRecord}>
                <strong>{item.title}</strong>
                <span className={styles.opsMeta}>{item.detail}</span>
                {item.href ? (
                  <Link className={styles.opsAction} href={item.href}>
                    Review event
                  </Link>
                ) : null}
              </div>
              <div>
                <div className={styles.opsState}>{item.state}</div>
                <div className={styles.opsAge}>{item.age}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="integration-health-heading"
      >
        <h2 id="integration-health-heading">Integration health</h2>
        <ul className={styles.healthList}>
          {operationsPreview.health.map((item) => (
            <li key={item.integration}>
              <div className={styles.healthIdentity}>
                <strong>{item.integration}</strong>
                <span className={styles.healthMeta}>
                  Last success {item.lastSuccess} · {item.detail}
                </span>
              </div>
              <span className={styles.healthState}>{item.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="reconciliation-heading"
      >
        <h2 id="reconciliation-heading">Reconciliation cases</h2>
        <ul className={styles.reconciliationList}>
          {operationsPreview.reconciliation.map((item) => (
            <li key={item.sourceRef}>
              <div className={styles.opsRecord}>
                <strong>{item.title}</strong>
                <span className={styles.reconciliationMeta}>
                  {item.sourceRef} · Last confirmed {item.lastConfirmed}
                </span>
                <Link className={styles.opsAction} href={item.href}>
                  Open reconciliation case
                </Link>
              </div>
              <span className={styles.reconciliationState}>{item.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="incident-heading"
      >
        <h2 id="incident-heading">Incident</h2>
        <div className={styles.incidentRow}>
          <div>
            <strong>
              {operationsPreview.incident.reference} ·{" "}
              {operationsPreview.incident.title}
            </strong>
            <span className={styles.incidentMeta}>
              {operationsPreview.incident.impact}
            </span>
          </div>
          <span className={styles.opsState}>
            {operationsPreview.incident.state}
          </span>
        </div>
      </section>
    </main>
  );
}
