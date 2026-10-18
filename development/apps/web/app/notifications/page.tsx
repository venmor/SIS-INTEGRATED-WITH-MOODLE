import { loadMine, NotificationInbox } from "./inbox";
import styles from "./notifications.module.css";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const result = await loadMine("/notifications");
  return <main id="main-content" tabIndex={-1} className={styles.main}><NotificationInbox items={result.data?.items ?? null} message={result.message} /></main>;
}
