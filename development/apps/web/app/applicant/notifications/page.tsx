import type { ApplicantNotification } from "@sis/contracts";
import { loadApplicant } from "../server";
import { ApplicationUnavailable } from "../chrome";
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  const r = await loadApplicant<{ items: ApplicantNotification[] }>(
    "/notifications",
    "/applicant/notifications",
  );
  if (!r.data) return <ApplicationUnavailable message={r.message} />;
  return (
    <>
      <h1>Notifications</h1>
      <p>
        Official decisions, clarification requests, and deadline reminders appear in your portal inbox.
      </p>
      <NotificationsList initial={r.data.items} />
    </>
  );
}
