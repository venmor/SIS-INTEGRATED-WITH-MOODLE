import { loadMine, NotificationInbox } from "../../notifications/inbox";

export const dynamic = "force-dynamic";
export default async function StudentNotificationsPage() {
  const result = await loadMine("/student/notifications");
  return <NotificationInbox items={result.data?.items ?? null} message={result.message} />;
}
