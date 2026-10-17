import type { RegistrationReceiptView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { CourseSummary } from "../../components/task-flow";
import workflow from "../../components/workflow.module.css";
import { academicHref } from "../../../lib/academic-context";
import { formatLusaka } from "../../../lib/time";
import study from "../study-workflows.module.css";

/** The same authoritative snapshot is shown after submit and on later visits. */
export function RegistrationReceipt({
  receipt,
}: {
  receipt: RegistrationReceiptView;
}) {
  return (
    <section
      className={study.section}
      aria-labelledby="registration-receipt-title"
    >
      <Notice
        severity="success"
        title="Registration completed"
        message={`Your official course registration for ${receipt.period} is complete.`}
      />
      <h2 id="registration-receipt-title">Registration receipt</h2>
      <dl className={study.facts}>
        <div>
          <dt>Registration reference</dt>
          <dd>{receipt.receipt}</dd>
        </div>
        <div>
          <dt>Registered on</dt>
          <dd>
            <time dateTime={receipt.decidedAt}>
              {formatLusaka(receipt.decidedAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Academic period</dt>
          <dd>{receipt.period}</dd>
        </div>
        <div>
          <dt>Registered courses</dt>
          <dd>{receipt.courses.length}</dd>
        </div>
        <div>
          <dt>Registered load</dt>
          <dd>{receipt.loadHalves} half-course equivalents</dd>
        </div>
        <div>
          <dt>Financial clearance at registration</dt>
          <dd>{receipt.clearance.replaceAll("_", " ")}</dd>
        </div>
      </dl>
      <CourseSummary
        courses={receipt.courses}
        caption="Officially registered courses"
      />
      <div className={study.actions}>
        <a
          className={workflow.action}
          href={academicHref("/student/timetable", receipt)}
        >
          View timetable
        </a>
      </div>
      <p className={study.muted}>
        Class times and learning access may still be in preparation. Course
        changes follow the approved change process.
      </p>
    </section>
  );
}
