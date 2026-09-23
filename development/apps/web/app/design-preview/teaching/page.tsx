import Link from "next/link";
import { teachingPreview } from "../data";
import styles from "../preview.module.css";

export default function TeachingPreviewPage() {
  return (
    <main className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <p className={styles.workspaceContext}>
          Teaching workspace · {teachingPreview.scope} ·{" "}
          {teachingPreview.academicPeriod}
        </p>
        <h1>Teaching home</h1>
        <p>{teachingPreview.role}</p>
      </header>

      <section
        className={styles.workspaceSection}
        aria-labelledby="urgent-actions-heading"
      >
        <h2 id="urgent-actions-heading">Urgent actions</h2>
        <ul className={styles.workQueue}>
          {teachingPreview.urgent.map((item) => (
            <li key={item.title}>
              <div className={styles.workItem}>
                <strong>{item.title}</strong>
                <span>{item.course}</span>
              </div>
              <span className={styles.workDue}>{item.due}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="current-courses-heading"
      >
        <h2 id="current-courses-heading">Current courses</h2>
        <ul className={styles.courseList}>
          <li className={styles.courseRecord}>
            <div className={styles.courseIdentity}>
              <h3>
                {teachingPreview.course.code} — {teachingPreview.course.title}
              </h3>
              <p className={styles.courseMeta}>{teachingPreview.role}</p>
              <div className={styles.courseFacts}>
                <span>{teachingPreview.course.classCount} students</span>
                <span>{teachingPreview.course.tgGroups} TG groups</span>
                <span>Next session: {teachingPreview.course.nextSession}</span>
              </div>
              <p className={styles.courseNext}>
                Next: Review Quiz 1 grade import
              </p>
            </div>
            <div className={styles.courseSide}>
              <span className={styles.courseState}>
                Moodle: {teachingPreview.course.moodleState}
              </span>
              <Link
                className={styles.inlineLink}
                href="/design-preview/teaching/course"
              >
                Open course workspace
              </Link>
            </div>
          </li>
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="teaching-notices-heading"
      >
        <h2 id="teaching-notices-heading">Teaching and integration notices</h2>
        <ul className={styles.noticeList}>
          <li>
            <strong>Class list synchronization</strong>
            <span>1 Moodle enrolment is pending reconciliation.</span>
          </li>
          <li>
            <strong>TG group synchronization</strong>
            <span>{teachingPreview.course.groups}</span>
          </li>
        </ul>
      </section>

      <section
        className={styles.workspaceSection}
        aria-labelledby="recent-work-heading"
      >
        <h2 id="recent-work-heading">Recent work</h2>
        <ul className={styles.recentList}>
          <li>
            <strong>Assessment plan published</strong>
            <span>{teachingPreview.course.code}</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
