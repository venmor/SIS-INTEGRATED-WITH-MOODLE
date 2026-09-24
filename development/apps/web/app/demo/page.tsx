import Link from "next/link";
import styles from "./demo.module.css";

const STORIES = [
  {
    title: "1 · Applicant to registered student",
    persona: "Lombe A. (offer checkpoint) · Phiri N. (registered checkpoint)",
    route: "/applications",
    href: "/applications",
    objective:
      "Show a released admission offer, then the live student finance, registration and Moodle handoff states.",
    fallback:
      "If you do not perform the conversion live, switch to Phiri N.'s seeded STUDENT workspace at /student.",
    state: "Phase 6 live",
  },
  {
    title: "2 · Teaching to assessment",
    persona: "Mwila T. (programme coordinator)",
    route: "/admin/teaching/groups",
    href: "/admin/teaching/groups",
    objective:
      "Show SIS-owned tutorial groups and teaching authority, then continue into the assessment journey.",
    fallback:
      "Assessment and official results remain a Phase 7 preview until that backend exists.",
    state: "Live → preview",
  },
  {
    title: "3 · Moodle failure to recovery",
    persona: "Kunda B. (Integration Support)",
    route: "/admin/integration",
    href: "/admin/integration",
    objective:
      "Triage the seeded dead letter, inspect SIS source truth versus Moodle state, review replay evidence and reconciliation.",
    fallback:
      "Use the seeded dead-letter/replay and ENROLMENT_MISMATCH records if a live failure is not reproduced.",
    state: "Phase 6 live",
  },
];

export default function DemoControlCentrePage() {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Presenter workspace</p>
        <h1>Demo Control Centre</h1>
        <p>
          A safe launch point for the fictional demonstration stories. It does
          not expose passwords, tokens or production reset controls.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="stories-heading">
        <div className={styles.sectionHeading}>
          <h2 id="stories-heading">Three presentation stories</h2>
          <Link href="/demo/stories">Open detailed story notes</Link>
        </div>
        <div className={styles.storyList}>
          {STORIES.map((story) => (
            <article className={styles.story} key={story.title}>
              <div className={styles.storyTop}>
                <h3>{story.title}</h3>
                <strong>{story.state}</strong>
              </div>
              <dl>
                <div>
                  <dt>Persona:</dt>
                  <dd>{story.persona}</dd>
                </div>
                <div>
                  <dt>Starting route:</dt>
                  <dd>
                    <Link href={story.href}>{story.route}</Link>
                  </dd>
                </div>
                <div>
                  <dt>Objective:</dt>
                  <dd>{story.objective}</dd>
                </div>
                <div>
                  <dt>Fallback:</dt>
                  <dd>{story.fallback}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="checklist-heading">
        <h2 id="checklist-heading">Presenter checklist</h2>
        <ol className={styles.checklist}>
          <li>
            From <code>development/</code>, run <code>npm run demo:reset</code>.
          </li>
          <li>
            Run <code>npm run demo:doctor</code> and require every check to pass.
          </li>
          <li>
            Use a clean browser profile so earlier sessions do not select the
            wrong role or workspace.
          </li>
          <li>
            Use the fictional personas by name; keep seeded credentials in the
            local operator notes, never on the presentation screen.
          </li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="readiness-heading">
        <h2 id="readiness-heading">Current story readiness</h2>
        <dl className={styles.readiness}>
          <div>
            <dt>Admissions → student → finance → registration</dt>
            <dd>Live through Phase 6</dd>
          </div>
          <div>
            <dt>Teaching and Moodle operations</dt>
            <dd>Live through Phase 6</dd>
          </div>
          <div>
            <dt>Assessment and official results</dt>
            <dd>Phase 7 preview</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
