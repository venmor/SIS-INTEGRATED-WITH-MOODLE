import Link from "next/link";
import type { ApplicationView } from "@sis/contracts";
import { Empty, Status } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import { loadApplicant } from "./server";
import { ApplicationUnavailable } from "./chrome";
import styles from "./applicant.module.css";

function statusFor(application: ApplicationView) {
  const remaining = Math.max(
    application.requiredCount - application.completeCount,
    0,
  );

  if (application.state === "Submitted") {
    return {
      severity: "info" as const,
      state: "Application submitted",
      reason: "Admissions received it.",
      action: "View status and timeline.",
    };
  }

  if (application.state === "Withdrawn") {
    return {
      severity: "neutral" as const,
      state: "Application withdrawn",
      reason: "No longer active.",
      action: "View history.",
    };
  }

  return {
    severity: remaining > 0 ? ("attention" as const) : ("success" as const),
    state: remaining > 0 ? "Draft — action required" : "Draft ready for review",
    reason:
      remaining > 0
        ? `${remaining} required section${remaining === 1 ? "" : "s"} need attention.`
        : "Required sections complete.",
    action: remaining > 0 ? "Continue application." : "Review and submit.",
  };
}

export default async function Home() {
  const result = await loadApplicant<{ items: ApplicationView[] }>(
    "",
    "/applicant",
  );

  if (!result.data) {
    return <ApplicationUnavailable message={result.message} />;
  }

  const activeDraft =
    result.data.items.find(
      (item) => item.state !== "Submitted" && item.state !== "Withdrawn",
    ) ?? null;

  return (
    <>
      <p className={styles.eyebrow}>Applicant workspace</p>
      <h1>Application home</h1>
      <p className={styles.lede}>Continue applications and track updates.</p>

      <div className={styles.actions}>
        <Link className={styles.buttonLink} href="/discover">
          Find a programme
        </Link>
        <Link href="/applicant/notifications">View notifications</Link>
        <Link href="/applicant/help">Get help</Link>
      </div>

      {activeDraft ? (
        <section
          className={styles.requiredAction}
          aria-labelledby="required-action-heading"
        >
          <div>
            <p className={styles.eyebrow}>Next step</p>
            <h2 id="required-action-heading">Required action</h2>
            <p>
              {activeDraft.offering.programmeName} · {activeDraft.offering.intake}
            </p>
            <p className={styles.muted}>
              {activeDraft.completeCount} of {activeDraft.requiredCount} required
              sections complete
            </p>
          </div>
          <Link
            className={styles.buttonLink}
            href={`/applicant/${activeDraft.id}`}
          >
            Continue application
          </Link>
        </section>
      ) : null}

      {!result.data.items.length ? (
        <Empty
          caseVariant="action"
          title="No applications yet"
          message="Choose a programme to start."
          action={{ label: "Find a programme", href: "/discover" }}
        />
      ) : (
        <section className={styles.grid} aria-label="Your applications">
          {result.data.items.map((application) => {
            const status = statusFor(application);
            const primaryLabel =
              application.state === "Submitted"
                ? "View submitted application"
                : application.state === "Withdrawn"
                  ? "View withdrawn application"
                  : "Continue application";

            return (
              <article key={application.id} className={styles.card}>
                <div>
                  <p className={styles.eyebrow}>
                    {application.offering.intake} ·{" "}
                    {application.offering.studyMode}
                  </p>
                  <h2>{application.offering.programmeName}</h2>
                  <p className={styles.muted}>
                    {application.offering.campus} · Reference{" "}
                    {application.reference}
                  </p>
                </div>

                <Status
                  severity={status.severity}
                  state={status.state}
                  reason={status.reason}
                  updated={`Last updated ${formatLusaka(application.updatedAt)}`}
                  action={status.action}
                />

                {application.state !== "Submitted" &&
                application.state !== "Withdrawn" ? (
                  <div className={styles.progressHeader}>
                    <p>
                      {application.completeCount} of {application.requiredCount}{" "}
                      required sections complete
                    </p>
                    <progress
                      value={application.completeCount}
                      max={Math.max(application.requiredCount, 1)}
                      aria-label={`${application.completeCount} of ${application.requiredCount} required application sections complete`}
                    />
                  </div>
                ) : null}

                <div className={styles.actions}>
                  <Link
                    className={styles.buttonLink}
                    href={`/applicant/${application.id}`}
                  >
                    {primaryLabel}
                  </Link>

                  {application.state === "Submitted" ||
                  application.state === "Withdrawn" ? (
                    <>
                      <Link href={`/applicant/${application.id}/status`}>
                        Status and timeline
                      </Link>
                      <Link href={`/applicant/${application.id}/decision`}>
                        Admission decision
                      </Link>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
