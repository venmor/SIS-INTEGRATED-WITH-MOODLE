import Link from "next/link";
import styles from "../demo.module.css";

const releaseId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GIT_COMMIT_SHA ??
  "local-demo";

export default function DemoEvidencePage() {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Presenter fallback pack</p>
        <h1>Presentation evidence</h1>
        <p>
          Read-only references for proving release state, authorization,
          recovery and accessibility when a live demonstration path is
          unavailable.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="release-heading">
        <h2 id="release-heading">Release evidence</h2>
        <dl className={styles.readiness}>
          <div>
            <dt>Release identifier</dt>
            <dd><code>{releaseId.slice(0, 12)}</code></dd>
          </div>
          <div>
            <dt>Data boundary</dt>
            <dd>Fictional demonstration records only</dd>
          </div>
          <div>
            <dt>Assessment state</dt>
            <dd>Phase 7 remains design preview only</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="audit-heading">
        <h2 id="audit-heading">Audit and authorization evidence</h2>
        <p>
          Use the live read-only audit surface to show who acted, under which
          role and scope, and the recorded outcome.
        </p>
        <p className={styles.links}>
          <Link href="/admin/audit">Audit log</Link>
          <Link href="/admin/access">Access review</Link>
        </p>
        <p>
          Authorization denial evidence: open a staff route using a persona
          without that role. The server-side guard remains the boundary even
          when navigation does not expose the link.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="recovery-heading">
        <h2 id="recovery-heading">Failure and recovery evidence</h2>
        <p>
          The integration workspace retains dead letters, replay decisions,
          incidents and reconciliation state so a provider outage can be
          demonstrated without changing SIS source records.
        </p>
        <p className={styles.links}>
          <Link href="/admin/integration">Integration recovery</Link>
          <Link href="/admin/integration/reconciliation">Reconciliation</Link>
          <Link href="/admin/moodle/maintenance">Moodle maintenance</Link>
        </p>
        <p>
          If the API or provider is temporarily unavailable, keep the current
          reference, do not repeat a destructive action, restore connectivity,
          then retry from the owning workspace.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="a11y-heading">
        <h2 id="a11y-heading">Accessibility evidence checklist</h2>
        <ul className={styles.checklist}>
          <li>390px and 1440px critical-route checks have no horizontal overflow.</li>
          <li>Keyboard focus remains visible on navigation, filters and actions.</li>
          <li>Status and authority are written in text; colour is never the only signal.</li>
          <li>Critical icon actions retain an accessible text label.</li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="limitations-heading">
        <h2 id="limitations-heading">Known limitations</h2>
        <ul className={styles.checklist}>
          <li>Phase 7 assessment and official results are previews, not authoritative records.</li>
          <li>Production Moodle credentials are never rendered in this browser surface.</li>
          <li>External provider availability may differ from the deterministic simulator.</li>
          <li>V2 future modules are visual contracts only until their backend domains exist.</li>
        </ul>
      </section>
    </main>
  );
}
