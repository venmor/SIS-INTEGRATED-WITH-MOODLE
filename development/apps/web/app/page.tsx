import { Status } from "@sis/ui";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Implementation shell · Phase 0</p>
        <h1 className={styles.title}>Student Information System</h1>
        <p className={styles.lede}>
          UNZA student lifecycle coordination, integrated with Moodle. This
          shell proves the interface baseline renders — no business feature
          lives here yet.
        </p>
        <Status
          severity="info"
          state="Shell running — no business data"
          reason="Interface, API liveness and design tokens are in place. Applicant, registration and result workflows arrive in later slices."
          updated="Phase 0, slice 4"
          action="Next: confirm the API answers, then continue to the first journey slice."
        />
        <div className={styles.actions}>
          <a
            className={styles.primary}
            href="http://localhost:3001/health"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check API health
          </a>
        </div>
        <p className={styles.supporting}>
          Expected API shape:{" "}
          <code className={styles.code}>
            {"{ status: 'ok', version: '0.1.0' }"}
          </code>
          . Colours are a proposed palette and require institutional approval.
        </p>
      </main>
    </div>
  );
}
