import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { OwnNotificationRecordView } from "@sis/contracts";
import { Card, Notice, PageHeader, StatusChip } from "@sis/ui";
import { NotificationActions } from "./actions";
import styles from "./notifications.module.css";
import { formatLusaka } from "../../lib/time";

export const dynamic = "force-dynamic";

// Own notification centre (TASK-PH8-001): the authoritative in-system
// record. The API returns only the caller's own records; delivery
// state rolls up across channels. Mandatory notices cannot be
// suppressed; optional ones honor preferences.
async function loadMine(): Promise<{
  data: { items: OwnNotificationRecordView[] } | null;
  message: string;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fnotifications");
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  let response: Response;
  try {
    response = await fetch(`${api}/notifications/records/mine`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return {
      data: null,
      message:
        "We cannot reach the notification service. Your record is kept. Try again shortly.",
    };
  }
  if (response.status === 401) redirect("/sign-in?returnTo=%2Fnotifications");
  if (!response.ok) {
    return {
      data: null,
      message: "Your notifications are unavailable right now.",
    };
  }
  return {
    data: (await response.json()) as { items: OwnNotificationRecordView[] },
    message: "",
  };
}

// Notice actions stay on this SIS origin. Malformed or external destinations
// cannot become a link even if a template writer supplied one.
function localAction(path: string | null): string | null {
  return path?.startsWith("/") &&
    !path.startsWith("//") &&
    !/[\\\u0000-\u0020]/u.test(path)
    ? path
    : null;
}

export default async function NotificationsPage() {
  const res = await loadMine();
  if (!res.data)
    return (
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <PageHeader
          eyebrow="Notification centre"
          title="Notifications"
          lede="Updates to your study and account."
        />
        <Notice severity="warning" title="Unavailable" message={res.message} />
        <p>
          <Link href="/">Return home</Link>
        </p>
      </main>
    );
  const items = res.data.items;
  return (
    <main id="main-content" tabIndex={-1} className={styles.main}>
      <PageHeader
        eyebrow="Notification centre"
        title="Notifications"
        lede="Read and manage updates to your study and account."
      />
      {items.length === 0 ? (
        <Notice
          severity="info"
          title="No notifications"
          message="Decisions, results, payments, deadlines and support updates will appear here."
        />
      ) : (
        <ul className={styles.history}>
          {items.map((item) => (
            <li key={item.id}>
              <p className={styles.noticeHeading}>
                <strong>{item.title}</strong>{" "}
                <StatusChip tone={item.state === "READ" ? "info" : "success"}>
                  {item.state}
                </StatusChip>
              </p>
              <p className={styles.body}>{item.body}</p>
              <p className={styles.meta}>
                {item.office ? <span>{item.office}</span> : null}
                {item.office ? " · " : ""}
                <time dateTime={item.createdAt}>
                  {formatLusaka(item.createdAt)}
                </time>
              </p>
              {localAction(item.actionPath) ? (
                <p className={styles.actions}>
                  <Link
                    className={styles.actionLink}
                    href={localAction(item.actionPath)!}
                  >
                    {item.category === "TIMETABLE"
                      ? "View timetable"
                      : item.category === "RESULT"
                        ? "View results"
                        : "View update"}
                  </Link>
                </p>
              ) : null}
              <NotificationActions item={item} />
            </li>
          ))}
        </ul>
      )}
      <Card title="About these notices">
        <p className={styles.meta}>
          In-system notices are the authoritative record. Previews sent
          elsewhere stay neutral and never reveal results, balances or support
          details.
        </p>
      </Card>
    </main>
  );
}
