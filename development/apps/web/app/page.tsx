import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>UNZA SIS — Moodle integration</h1>
          <p>
            Phase 0 application shell. No business feature lives here yet —
            this page only proves the Next.js + CSS Modules baseline renders.
          </p>
          <p>
            Backend liveness: <code className={styles.code}>GET /health</code>{" "}
            on the NestJS API at{" "}
            <a href="http://localhost:3001/health">localhost:3001/health</a>,
            expected shape{" "}
            <code className={styles.code}>
              {"{ status: 'ok', version: '0.1.0' }"}
            </code>
            .
          </p>
        </div>
        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="http://localhost:3001/health"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check API health
          </a>
          <a
            className={styles.secondary}
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js docs
          </a>
        </div>
      </main>
    </div>
  );
}
