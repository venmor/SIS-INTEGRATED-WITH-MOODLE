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
        Decisions, clarification requests and deadline reminders appear here.
        Email or SMS messages never carry outcomes; sign in to read them.
      </p>
      <NotificationsList initial={r.data.items} />
    </>
  );
}
