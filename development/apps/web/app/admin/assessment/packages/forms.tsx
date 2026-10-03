"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postAssessment(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/assessment${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { message?: string }).message ??
        "The assessment service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as {
      detail?: { supportReference?: string; code?: string };
    }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Board-package assembly: a lecturer or coordinator freezes the approved
// official CA refs, weighted-total-v1 preview, moderation refs and
// candidate reconciliation behind the exact declaration. Blocked
// server-side unless every component is moderated-approved with no open
// missing-mark findings. Every submit carries a fresh idempotency key.
export function AssemblePackageForm({
  offeringRef,
  periodCode,
}: {
  offeringRef: string;
  periodCode: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The package was not assembled" errors={errors} />
      ) : null}
      <h2>Assemble result package</h2>
      <form
        aria-label="Assemble result package"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          if (!data.get("assemble-package-confirm")) {
            setErrors([
              {
                fieldId: "assemble-package-confirm",
                message:
                  "Confirm that you have reviewed the stated evidence before assembling.",
              },
            ]);
            setPending(false);
            return;
          }
          postAssessment("/packages", {
            offeringRef,
            periodCode,
            declaration:
              "I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.",
            idempotencyKey: crypto.randomUUID(),
          })
            .then((out) => {
              const hash = (out as { packageHash?: string }).packageHash ?? "";
              setNotice(
                `Result package assembled. Package hash ${hash.slice(0, 16)}…. The package makes no release; the board decides next.`,
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                { fieldId: "assemble-package-confirm", message: failure(error) },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <input
            id="assemble-package-confirm"
            name="assemble-package-confirm"
            type="checkbox"
            value="yes"
          />{" "}
          <label htmlFor="assemble-package-confirm">
            I confirm that the approved results, moderation outcomes and
            candidate list for {offeringRef} {periodCode} are complete, and I
            assemble this package within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Assembling…" : "Assemble package"}
          </button>
        </p>
      </form>
    </>
  );
}

// Board decision form: the examinations authority records one of six
// outcomes with four-eyes (decider differs from preparer, enforced
// server-side). Non-approvals demand a reason; conditions store for
// release enforcement. Version-checked and idempotent: concurrent
// decisions conflict instead of silently overwriting.
export function BoardDecisionForm({
  packageId,
  version,
  decided,
}: {
  packageId: string;
  version: number;
  decided: boolean;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (decided) {
    return (
      <Notice
        severity="info"
        title="Decision recorded"
        message="This package already carries a board decision. Decided packages keep their outcome; deferrals re-submit as new versions."
      />
    );
  }

  return (
    <>
      {notice ? <p role="status">{notice}</p> : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The decision was not recorded" errors={errors} />
      ) : null}
      <form
        aria-label="Record board decision"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          const to = String(data.get("board-decision-to") ?? "");
          const reason = String(data.get("board-decision-reason") ?? "");
          const condition = String(
            data.get("board-decision-condition") ?? "",
          ).trim();
          postAssessment(`/packages/${packageId}/decide`, {
            version,
            to,
            reason: reason || undefined,
            conditions: condition
              ? [{ text: condition, blocksRelease: false }]
              : undefined,
            idempotencyKey: crypto.randomUUID(),
          })
            .then(() => {
              setNotice(
                to === "APPROVE_FOR_RELEASE"
                  ? "Package approved for release. Students still see nothing until the official release."
                  : `Decision ${to} recorded. History preserved.`,
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                {
                  fieldId: "board-decision-reason",
                  message: failure(error),
                },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <label htmlFor="board-decision-to">Board decision</label>{" "}
          <select id="board-decision-to" name="board-decision-to">
            <option value="APPROVE_FOR_RELEASE">Approve for release</option>
            <option value="RETURN">Return</option>
            <option value="CLARIFY">Request clarification</option>
            <option value="CONDITION">Decide with condition</option>
            <option value="DEFER">Defer</option>
            <option value="REFER">Refer</option>
          </select>
        </p>
        <p>
          <label htmlFor="board-decision-reason">
            Reason (required unless approving for release)
          </label>{" "}
          <input
            id="board-decision-reason"
            name="board-decision-reason"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <label htmlFor="board-decision-condition">
            Condition (stored for release enforcement, optional)
          </label>{" "}
          <input
            id="board-decision-condition"
            name="board-decision-condition"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record board decision"}
          </button>
        </p>
      </form>
    </>
  );
}

// Official release (TASK-PH7-006): the examinations authority publishes
// an approved-for-release package into immutable official results.
// Blocked server-side unless the frozen trace still governs (no stale
// approvals, no blocking conditions, every subject resolved). Every
// submit carries a fresh idempotency key; concurrent releases converge
// instead of duplicating. Delivery failure never rolls back the
// release; students see only their own published rows.
export function ReleaseResultsForm({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The results were not released" errors={errors} />
      ) : null}
      <form
        aria-label="Release official results"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          if (!data.get("release-results-confirm")) {
            setErrors([
              {
                fieldId: "release-results-confirm",
                message:
                  "Confirm that the board approved this package for release before publishing.",
              },
            ]);
            setPending(false);
            return;
          }
          postAssessment("/releases", {
            packageId,
            idempotencyKey: crypto.randomUUID(),
          })
            .then((out) => {
              const count = (out as { studentCount?: number }).studentCount ?? 0;
              setNotice(
                `Released. ${count} official results published; students see only their own.`,
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                { fieldId: "release-results-confirm", message: failure(error) },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <input
            id="release-results-confirm"
            name="release-results-confirm"
            type="checkbox"
            value="yes"
          />{" "}
          <label htmlFor="release-results-confirm">
            I confirm that the board approved this package for release and I
            publish these official results within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Releasing…" : "Release results"}
          </button>
        </p>
      </form>
    </>
  );
}

// Result amendment request (TASK-PH7-007): an authorized requester
// opens a controlled case on one released result with reason,
// evidence, corrected total and the exact declaration. Blocked
// server-side unless the package is released and the student carries
// a released row. Every submit carries a fresh idempotency key.
export function RequestAmendmentForm({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The amendment was not requested" errors={errors} />
      ) : null}
      <form
        aria-label="Request result amendment"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          if (!data.get("amendment-confirm")) {
            setErrors([
              {
                fieldId: "amendment-confirm",
                message:
                  "Confirm that this amendment is complete for its student before submitting.",
              },
            ]);
            setPending(false);
            return;
          }
          postAssessment("/amendments", {
            packageId,
            studentRef: String(data.get("amendment-student") ?? "").trim(),
            correctedTotal: Number(data.get("amendment-total") ?? NaN),
            reason: String(data.get("amendment-reason") ?? ""),
            evidence: String(data.get("amendment-evidence") ?? "") || undefined,
            declaration:
              "I confirm that this official-result amendment is complete for its student and I submit it within my assigned authority.",
            idempotencyKey: crypto.randomUUID(),
          })
            .then(() => {
              setNotice(
                "Amendment case opened. The examinations authority approves or declines; the original result stays unchanged until approval.",
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                { fieldId: "amendment-student", message: failure(error) },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <label htmlFor="amendment-student">Student reference</label>{" "}
          <input
            id="amendment-student"
            name="amendment-student"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <label htmlFor="amendment-total">Corrected total (0–100)</label>{" "}
          <input
            id="amendment-total"
            name="amendment-total"
            type="number"
            min={0}
            max={100}
            step="0.01"
          />
        </p>
        <p>
          <label htmlFor="amendment-reason">
            Reason with documented authority
          </label>{" "}
          <input
            id="amendment-reason"
            name="amendment-reason"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <label htmlFor="amendment-evidence">Evidence reference</label>{" "}
          <input
            id="amendment-evidence"
            name="amendment-evidence"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <input
            id="amendment-confirm"
            name="amendment-confirm"
            type="checkbox"
            value="yes"
          />{" "}
          <label htmlFor="amendment-confirm">
            I confirm that this official-result amendment is complete for
            its student and I submit it within my assigned authority.
          </label>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Requesting…" : "Request amendment"}
          </button>
        </p>
      </form>
    </>
  );
}

// Amendment decision form: the examinations authority approves (new
// immutable official version + progression-recalculation task) or
// declines with reason, with four-eyes (approver differs from
// requester, enforced server-side). Version-checked and idempotent.
export function DecideAmendmentForm({
  caseId,
  version,
  decided,
}: {
  caseId: string;
  version: number;
  decided: boolean;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (decided) {
    return (
      <Notice
        severity="info"
        title="Amendment decided"
        message="This case already carries a decision. Decided cases keep their outcome; open a new case for further correction."
      />
    );
  }

  const toId = `amendment-decision-to-${caseId}`;
  const reasonId = `amendment-decision-reason-${caseId}`;

  return (
    <>
      {notice ? <p role="status">{notice}</p> : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The amendment was not decided" errors={errors} />
      ) : null}
      <form
        aria-label="Decide result amendment"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          setPending(true);
          setErrors([]);
          setNotice(null);
          const data = new FormData(e.currentTarget);
          const to = String(data.get("amendment-decision-to") ?? "");
          const reason = String(data.get("amendment-decision-reason") ?? "");
          postAssessment(`/amendments/${caseId}/decide`, {
            version,
            to,
            reason: reason || undefined,
            idempotencyKey: crypto.randomUUID(),
          })
            .then(() => {
              setNotice(
                to === "APPROVE"
                  ? "Amendment approved. A new official version is published; the student sees the current version."
                  : `Amendment ${to} recorded. History preserved.`,
              );
              router.refresh();
            })
            .catch((error: unknown) => {
              setErrors([
                {
                  fieldId: reasonId,
                  message: failure(error),
                },
              ]);
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <p>
          <label htmlFor={toId}>Amendment decision</label>{" "}
          <select id={toId} name="amendment-decision-to">
            <option value="APPROVE">Approve</option>
            <option value="DECLINE">Decline</option>
          </select>
        </p>
        <p>
          <label htmlFor={reasonId}>
            Reason (required when declining)
          </label>{" "}
          <input
            id={reasonId}
            name="amendment-decision-reason"
            type="text"
            autoComplete="off"
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record amendment decision"}
          </button>
        </p>
      </form>
    </>
  );
}
