import Link from "next/link";
import styles from "./results.module.css";
import { Card, Notice, PageHeader, StatusChip } from "@sis/ui";
import type { StudentResultsView } from "@sis/contracts";
import { loadResult } from "../../admin/assessment/result-server";
import { formatLusaka } from "../../../lib/time";

export const dynamic = "force-dynamic";
export default async function ResultsPage() {
  const result = await loadResult<StudentResultsView>(
    "/me/results",
    "/student/results",
  );
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <PageHeader
        eyebrow="Student portal"
        title="Official results"
        lede="Published course results and their version history. Progression decisions are shown separately from course outcomes."
      />
      <p>
        <Link href="/student">Student home</Link>
      </p>
      {!result.data ? (
        <Notice
          severity="warning"
          title="Results unavailable"
          message={result.message}
        />
      ) : (
        <>
          {result.data.items.length === 0 ? (
            <Notice
              severity="info"
              title="No official results released"
              message="Results will appear here after the authorized publication process. A Moodle mark is learning feedback and does not establish your official result."
            />
          ) : null}
          {result.data.items.map((item) => (
            <Card
              key={`${item.courseCode}-${item.periodCode}`}
              title={`${item.courseCode} · ${item.courseTitle}`}
            >
              <p>
                {item.periodCode} ·{" "}
                <StatusChip tone="success">
                  Official result — released
                </StatusChip>
              </p>
              <dl>
                <dt>Outcome</dt>
                <dd>{item.outcome}</dd>
                <dt>Official mark</dt>
                <dd>
                  {item.mark === null
                    ? "Not displayed under the release policy"
                    : `${item.mark} / 100`}
                </dd>
                <dt>Published</dt>
                <dd>{formatLusaka(item.publishedAt)}</dd>
                <dt>Current version</dt>
                <dd>{item.version}</dd>
              </dl>
              <Notice
                severity="info"
                title={
                  item.progressionReadiness === "REVIEW_REQUIRED"
                    ? "Academic impact review required"
                    : "Progression not yet evaluated"
                }
                message={
                  item.progressionReadiness === "REVIEW_REQUIRED"
                    ? "This result was amended. The responsible academic team must review its effect on progression and registration. Your existing courses and learning access have not been removed by this amendment."
                    : "This course result does not itself decide progression, supplementary eligibility or a repeat requirement."
                }
              />
              <h2>Result review</h2>
              <p>{item.reviewInstructions}</p>
              <details>
                <summary>Published version history</summary>
                <ol>
                  {item.history.map((version) => (
                    <li key={version.version}>
                      Version {version.version}: {version.outcome}
                      {version.mark === null
                        ? ""
                        : ` · ${version.mark} / 100`}{" "}
                      · {formatLusaka(version.publishedAt)}
                      {version.version === item.version
                        ? " · Current"
                        : " · Superseded"}
                    </li>
                  ))}
                </ol>
              </details>
            </Card>
          ))}
        </>
      )}
    </main>
  );
}
