import Link from "next/link";
import type { ApplicationView } from "@sis/contracts";
import { loadApplicant } from "./server";
import { ApplicationContext, ApplicationUnavailable } from "./chrome";
import styles from "./applicant.module.css";
export default async function Home() {
  const result = await loadApplicant<{ items: ApplicationView[] }>(
    "",
    "/applicant",
  );
  if (!result.data) return <ApplicationUnavailable message={result.message} />;
  return (
    <>
      <h1>My applications</h1>
      <p>
        A saved draft has not been submitted. Continue an application below or
        choose a programme.
      </p>
      <Link href="/discover">Find a programme</Link>
      {!result.data.items.length ? (
        <p>No applications yet. Start from a published programme.</p>
      ) : (
        result.data.items.map((a) => (
          <article key={a.id} className={styles.card}>
            <ApplicationContext application={a} />
            <p>
              {a.completeCount} of {a.requiredCount} required sections complete
            </p>
            <Link href={`/applicant/${a.id}`}>
              {a.state === "Submitted"
                ? "View submitted application"
                : "Continue application"}
            </Link>
          </article>
        ))
      )}
    </>
  );
}
