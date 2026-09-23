import { teachingPreview } from "../../data";
import styles from "../../preview.module.css";

const sections = [
  "Overview",
  "Class list",
  "Assessment",
  "Learning and Moodle",
  "Grade review",
  "Communication",
  "TG groups",
  "Course history",
] as const;

export default function TeachingCoursePreviewPage() {
  const course = teachingPreview.course;

  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          {course.code} · {teachingPreview.academicPeriod} · Lecturer ·{" "}
          {course.scope}
        </p>
        <h1>{course.title}</h1>
        <p>Active teaching period</p>
      </header>

      <nav className={styles.courseNav} aria-label="Course workspace sections">
        {sections.map((section) => (
          <span key={section}>{section}</span>
        ))}
      </nav>

      <section
        className={styles.workspaceSection}
        aria-labelledby="class-list-status-heading"
      >
        <h2 id="class-list-status-heading">Class list status</h2>
        <dl className={styles.courseStatusFacts}>
          <div>
            <dt>SIS registered students</dt>
            <dd>{course.sisClassList}</dd>
          </div>
          <div>
            <dt>TG groups</dt>
            <dd>{course.tgGroups}</dd>
          </div>
          <div>
            <dt>Last class-list update</dt>
            <dd>{course.lastSync}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.workspaceSection}
        aria-label="Moodle synchronization"
      >
        <div className={styles.integrationHeading}>
          <div>
            <p className={styles.sectionEyebrow}>Learning integration</p>
            <h2>Moodle synchronization</h2>
          </div>
          <strong>Attention needed</strong>
        </div>

        <dl className={styles.courseStatusFacts}>
          <div>
            <dt>Moodle enrolled students</dt>
            <dd>{course.moodleEnrolled}</dd>
          </div>
          <div>
            <dt>Sync status</dt>
            <dd>{course.moodleState}</dd>
          </div>
          <div>
            <dt>Teaching roles</dt>
            <dd>{course.teachingRoles}</dd>
          </div>
          <div>
            <dt>TG groups</dt>
            <dd>{course.groups}</dd>
          </div>
          <div>
            <dt>Last synchronized</dt>
            <dd>{course.lastSync}</dd>
          </div>
        </dl>

        <p className={styles.nextRow}>
          <strong>Next:</strong> integration team reconciles the pending learner.
        </p>
      </section>
    </main>
  );
}
