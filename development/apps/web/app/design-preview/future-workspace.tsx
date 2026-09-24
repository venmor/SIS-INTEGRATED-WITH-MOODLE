import styles from "./preview.module.css";

type QueueItem = { title: string; meta: string; state: string };
type Fact = { label: string; value: string };

export function FutureWorkspace({
  context,
  title,
  maturity,
  summary,
  queue,
  facts,
  authority,
  recovery,
}: {
  context: string;
  title: string;
  maturity: "Preview — planned v1.x" | "Operational completion target — v2.0";
  summary: string;
  queue: QueueItem[];
  facts: Fact[];
  authority: string;
  recovery: string;
}) {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>{context}</p>
        <h1>{title}</h1>
        <strong>{maturity}</strong>
        <p>{summary}</p>
      </header>

      <section className={styles.workspaceSection} aria-label="Work queue">
        <h2>Work queue</h2>
        <ul className={styles.opsList}>
          {queue.map((item) => (
            <li key={item.title}>
              <div className={styles.opsRecord}>
                <strong>{item.title}</strong>
                <span className={styles.opsMeta}>{item.meta}</span>
              </div>
              <span className={styles.opsState}>{item.state}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.workspaceSection} aria-label="Record detail">
        <h2>Record detail</h2>
        <dl className={styles.authorityFacts}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.readinessNote}>{authority}</p>
      </section>

      <section className={styles.workspaceSection} aria-label="State and recovery">
        <h2>State and recovery</h2>
        <div className={styles.recoveryCopy}>
          <p>{recovery}</p>
          <p><strong>Preview boundary:</strong> no action on this screen writes an authoritative record.</p>
        </div>
      </section>
    </main>
  );
}
