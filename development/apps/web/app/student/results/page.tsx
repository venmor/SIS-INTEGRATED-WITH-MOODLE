import Link from "next/link";
import study from "../study-workflows.module.css";
import { Notice } from "@sis/ui";
import type { StudentResultsView } from "@sis/contracts";
import { loadResult } from "../../admin/assessment/result-server";
import { ResultsList } from "./results-list";

export const dynamic = "force-dynamic";
export default async function ResultsPage() {
  const result = await loadResult<StudentResultsView>(
    "/me/results",
    "/student/results",
  );
  return (
    <div className={study.page}>
      <header className={study.intro}>
        <p className={study.eyebrow}>Results and academic record</p>
        <h1>Official results</h1>
        <p className={study.muted}>
          Browse released course outcomes in a table, then open one course for
          details and version history. Progression decisions are separate from
          course outcomes. Moodle learning feedback does not establish an
          official result.
        </p>
      </header>
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
          {result.data.items.length > 0 ? (
            <ResultsList items={result.data.items} />
          ) : null}
        </>
      )}
      <Notice
        severity="info"
        title="Assessment breakdowns are not available here yet"
        message="This page currently contains official course outcomes only. Year of study, semester and separate test, quiz, assignment, project and exam results are not supplied by the current student results service."
      />
      <p>
        <Link href="/student">Student home</Link>
      </p>
    </div>
  );
}
