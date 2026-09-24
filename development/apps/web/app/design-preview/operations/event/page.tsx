import styles from "../../preview.module.css";

const event = {
  type: "RegistrationCompleted",
  sourceReference: "REG-2027-00123",
  destination: "Moodle",
  state: "Delivery failed · destination timeout",
  lastAttempt: "14:20 CAT",
  nextRetry: "14:35 CAT",
  idempotencyReference: "evt_reg_2027_00123_v1",
  impact: "Moodle learning access delayed; SIS registration is valid",
} as const;

export default function EventDeliveryPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.eventHeader}>
        <p className={styles.workspaceContext}>
          Integration Support workspace · Production environment
        </p>
        <h1>Event delivery</h1>
        <p>{event.type}</p>
      </header>

      <section
        className={styles.workspaceSection}
        aria-labelledby="delivery-heading"
      >
        <h2 id="delivery-heading">Delivery</h2>
        <dl className={styles.eventFacts}>
          <div>
            <dt>Source reference</dt>
            <dd>{event.sourceReference}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>{event.destination}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{event.state}</dd>
          </div>
          <div>
            <dt>Last attempt</dt>
            <dd>{event.lastAttempt}</dd>
          </div>
          <div>
            <dt>Next retry</dt>
            <dd>{event.nextRetry}</dd>
          </div>
          <div>
            <dt>Idempotency reference</dt>
            <dd>{event.idempotencyReference}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="business-impact-heading"
      >
        <h2 id="business-impact-heading">Business impact</h2>
        <p>{event.impact}</p>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="retry-safety-heading"
      >
        <h2 id="retry-safety-heading">Retry safety</h2>
        <div className={styles.recoveryCopy}>
          <p>Resend the same event after confirming destination state.</p>
          <p>
            Mark resolved only after confirmed delivery or reconciliation.
          </p>
        </div>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="audit-timeline-heading"
      >
        <h2 id="audit-timeline-heading">Audit timeline</h2>
        <ol className={styles.auditList}>
          <li>
            <time>14:20 CAT</time>
            <span>Delivery failed · destination timeout</span>
          </li>
          <li>
            <time>14:20 CAT</time>
            <span>Retry scheduled with the same idempotency reference</span>
          </li>
          <li>
            <time>14:02 CAT</time>
            <span>Previous Moodle synchronization confirmed</span>
          </li>
        </ol>
      </section>
    </main>
  );
}
