import Link from 'next/link';
import { MoodleSignIn } from './moodle-sign-in';
import type { RegistrationStatusView } from '@sis/contracts';
import { StatusChip } from '@sis/ui';
import styles from './moodle-access.module.css';
type Access = NonNullable<RegistrationStatusView['moodle']['access']>;
const labels = { CONFIRMED: 'Ready', REVIEW: 'Needs support', RETRY: 'Retry scheduled', WAITING: 'Preparing access' };

export function MoodleAccess({ access }: { access: Access }) {
  return <section id="moodle-learning" className={styles.panel} aria-labelledby="moodle-learning-heading">
    <header className={styles.heading}><div><p className={styles.kicker}>Learning platform</p><h2 id="moodle-learning-heading">Moodle courses</h2></div>
      <StatusChip tone={access.state === 'READY' ? 'success' : 'info'}>{access.confirmedCount} of {access.totalCourses} ready</StatusChip>
    </header>
    {access.confirmedCount > 0 && access.username ? <MoodleSignIn username={access.username} moodleUrl={access.moodleUrl} registrationId={access.registrationId} initialPasswordAvailable={access.initialPasswordAvailable} /> : null}
    <div className={styles.grid}>{access.courses.map((course) => <article className={styles.course} key={course.courseRegistrationId}>
      <div><strong className={styles.code}>{course.courseCode}</strong><h3>{course.courseTitle}</h3></div>
      <StatusChip tone={course.state === 'CONFIRMED' ? 'success' : course.state === 'REVIEW' ? 'warning' : 'info'}>{labels[course.state]}</StatusChip>
      {course.moodleCourseUrl ? <a href={course.moodleCourseUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open course ${course.courseCode}: ${course.courseTitle} (opens in new tab)`}>Open course ↗</a> : <p>Registration is complete. Course access is being prepared.</p>}
      {course.verifiedAt ? <p className={styles.time}>Confirmed {new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lusaka', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(course.verifiedAt))} CAT</p> : null}
    </article>)}</div>
    <p className={styles.help}>Use your Moodle sign-in details. Your first sign-in may ask you to choose a new password. <Link href="/student/support">Request learning access support</Link></p>
  </section>;
}
