"use client";

import { useState } from "react";
import type {
  ReviewEvidenceView,
  ReviewFindingView,
  ReviewTimelineEvent,
} from "@sis/contracts";
import { Empty, ErrorSummary, Notice } from "@sis/ui";
import { formatLusaka } from "../../../../../lib/time";
import styles from "../../../../page.module.css";
import caseStyles from "./case.module.css";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postReview(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/review${path}`, {
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
        "The review service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the case state before retrying.";
}

function asRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  return out;
}

export function ReviewCase({
  evidence,
  initialFindings,
  initialHistory,
}: {
  evidence: ReviewEvidenceView;
  initialFindings: ReviewFindingView[];
  initialHistory: ReviewTimelineEvent[];
}) {
  const [current, setCurrent] = useState(evidence);
  const [findings, setFindings] = useState(initialFindings);
  const [history, setHistory] = useState(initialHistory);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshCase() {
    try {
      const [evRes, fRes, hRes] = await Promise.all([
        fetch(`/api/review/${current.applicationId}/evidence`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch(`/api/review/${current.applicationId}/findings`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch(`/api/review/${current.applicationId}/history`, {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);
      if (evRes.ok)
        setCurrent((await evRes.json()) as ReviewEvidenceView);
      if (fRes.ok) {
        const data = (await fRes.json()) as { items: ReviewFindingView[] };
        setFindings(data.items);
      }
      if (hRes.ok) {
        const data = (await hRes.json()) as { items: ReviewTimelineEvent[] };
        setHistory(data.items);
      }
    } catch {
      // Refresh is best-effort; the success notice already confirms the write.
    }
  }

  async function submit(
    path: string,
    body: Record<string, unknown>,
    done: string,
    form?: HTMLFormElement | null,
  ) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    // Fresh key per attempt: reusing a key after a failure would surface
    // IDEMPOTENCY_CONFLICT instead of recording the new action.
    const attemptKey = crypto.randomUUID();
    try {
      await postReview(path, {
        version: current.version,
        ...body,
        idempotencyKey: attemptKey,
      });
      form?.reset();
      setNotice(done);
      await refreshCase();
    } catch (error) {
      setErrors([{ fieldId: "review-case", message: errorText(error) }]);
    } finally {
      setPending(false);
    }
  }

  async function decide(
    correctionId: string,
    approve: boolean,
    form: HTMLFormElement,
  ) {
    if (pending) return;
    setPending(true);
    setErrors([]);
    setNotice(null);
    const attemptKey = crypto.randomUUID();
    try {
      const data = new FormData(form);
      await postReview(`/corrections/${correctionId}/decide`, {
        approve,
        note: String(data.get(`note-${correctionId}`) ?? ""),
        idempotencyKey: attemptKey,
      });
      setNotice(
        approve
          ? "Correction approved. The submitted snapshot is unchanged."
          : "Correction declined. The submitted application is unchanged.",
      );
      await refreshCase();
    } catch (error) {
      setErrors([{ fieldId: "review-case", message: errorText(error) }]);
    } finally {
      setPending(false);
    }
  }

  const declared = asRecord(current.personal);
  const contact = asRecord(current.contact);
  const qualifications = asRecord(current.qualifications);

  return (
    <div id="review-case" className={caseStyles.case}>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary
          title="The review action did not complete"
          errors={errors}
        />
      ) : null}
      <Notice
        severity="info"
        title="Restricted case file"
        message="Assigned reviewers only. Every view and action here is audited; applicant-visible and internal content stay separate."
      />

      <h2>Declarations vs documents</h2>
      <p className={styles.supporting}>
        {current.offering.programmeName} ({current.offering.programmeCode}) ·{" "}
        {current.offering.intake} · State {current.state} · Version{" "}
        {current.version}
      </p>
      <h3>Declared personal</h3>
      <ul>
        {Object.entries(declared).map(([k, v]) => (
          <li key={k}>
            {k}: {v}
          </li>
        ))}
      </ul>
      <h3>Declared contact</h3>
      <ul>
        {Object.entries(contact).map(([k, v]) => (
          <li key={k}>
            {k}: {v}
          </li>
        ))}
      </ul>
      <h3>Declared qualifications</h3>
      <ul>
        {Object.entries(qualifications).map(([k, v]) => (
          <li key={k}>
            {k}: {v}
          </li>
        ))}
      </ul>

      <h3>Documents (state only — bytes never render here)</h3>
      {current.documents.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title="No documents"
          message="No evidence files are attached to this application."
        />
      ) : (
        <ul>
          {current.documents.map((d) => (
            <li key={d.id}>
              <strong>{d.fileName}</strong> · {d.category} · {d.status} · v
              {d.version}
              {d.canPreview ? "" : " · preview unavailable in this state"}
            </li>
          ))}
        </ul>
      )}

      <h2>Review findings</h2>
      {findings.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title="No findings yet"
          message="Record what the evidence shows. Findings never modify applicant data."
        />
      ) : (
        <ul>
          {findings.map((f) => (
            <li key={f.id}>
              <strong>
                {f.kind} · {f.subject}
              </strong>{" "}
              — {f.severity} · {f.status} · {formatLusaka(f.createdAt)}
              <br />
              {f.detail}
            </li>
          ))}
        </ul>
      )}
      <form
        aria-label="Record a review finding"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          submit(
            `/${current.applicationId}/findings`,
            {
              kind: String(data.get("kind") ?? "NOTE"),
              subject: String(data.get("subject") ?? ""),
              detail: String(data.get("detail") ?? ""),
              severity: String(data.get("severity") ?? "INFO"),
            },
            "Finding recorded.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="finding-kind">Kind</label>{" "}
          <select id="finding-kind" name="kind" defaultValue="NOTE">
            <option value="COMPLETENESS">Completeness</option>
            <option value="DECLARATION_MISMATCH">Declaration mismatch</option>
            <option value="DOCUMENT_QUALITY">Document quality</option>
            <option value="PAYMENT_STATUS">Payment status</option>
            <option value="NOTE">Note</option>
          </select>
        </p>
        <p>
          <label htmlFor="finding-subject">Subject</label>{" "}
          <input
            id="finding-subject"
            name="subject"
            type="text"
            maxLength={120}
            required
          />
        </p>
        <p>
          <label htmlFor="finding-detail">Detail</label>{" "}
          <textarea
            id="finding-detail"
            name="detail"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <label htmlFor="finding-severity">Severity</label>{" "}
          <select id="finding-severity" name="severity" defaultValue="INFO">
            <option value="INFO">Info</option>
            <option value="ACTION_NEEDED">Action needed</option>
          </select>
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Working…" : "Record finding"}
          </button>
        </p>
      </form>

      <h2>Eligibility and recommendation</h2>
      <p className={styles.supporting}>
        Record an eligibility outcome and a recommendation against the demo
        criteria version. This never modifies applicant data and is never a
        decision. A new version supersedes the active package; history is
        preserved.
      </p>
      {current.recommendation ? (
        <ul>
          <li>
            <strong>
              {current.recommendation.eligibilityOutcome} ·{" "}
              {current.recommendation.recommendation}
            </strong>{" "}
            — v{current.recommendation.version} ·{" "}
            {current.recommendation.criteriaVersion} ·{" "}
            {formatLusaka(current.recommendation.createdAt)}
            <br />
            Criteria:{" "}
            {current.recommendation.criteria.length > 0
              ? current.recommendation.criteria.join(", ")
              : "none listed"}
            <br />
            {current.recommendation.rationale}
          </li>
        </ul>
      ) : (
        <Empty
          caseVariant="nothing"
          title="No recommendation yet"
          message="Record the first recommendation package for this case."
        />
      )}
      <form
        aria-label="Record a recommendation"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          submit(
            `/${current.applicationId}/recommendations`,
            {
              eligibilityOutcome: String(
                data.get("eligibilityOutcome") ?? "UNDETERMINED",
              ),
              recommendation: String(
                data.get("recommendation") ?? "NEEDS_INFORMATION",
              ),
              criteria: data.getAll("criteria").map(String),
              rationale: String(data.get("rationale") ?? ""),
              ...(current.recommendation
                ? { supersedesId: current.recommendation.id }
                : {}),
            },
            current.recommendation
              ? "Recommendation superseded with a new version."
              : "Recommendation recorded.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="rec-eligibility">Eligibility outcome</label>{" "}
          <select
            id="rec-eligibility"
            name="eligibilityOutcome"
            defaultValue="UNDETERMINED"
          >
            <option value="ELIGIBLE">Eligible</option>
            <option value="NOT_ELIGIBLE">Not eligible</option>
            <option value="UNDETERMINED">Undetermined</option>
          </select>
        </p>
        <p>
          <label htmlFor="rec-decision">Recommendation</label>{" "}
          <select
            id="rec-decision"
            name="recommendation"
            defaultValue="NEEDS_INFORMATION"
          >
            <option value="FAVOURABLE">Favourable</option>
            <option value="UNFAVOURABLE">Unfavourable</option>
            <option value="NEEDS_INFORMATION">Needs information</option>
          </select>
        </p>
        <fieldset>
          <legend>Demo criteria considered</legend>
          {[
            "COMPLETENESS",
            "DECLARATION_MATCH",
            "DOCUMENT_QUALITY",
            "MINIMUM_ELIGIBILITY",
          ].map((criterion) => (
            <p key={criterion}>
              <label htmlFor={`rec-criterion-${criterion}`}>
                <input
                  id={`rec-criterion-${criterion}`}
                  name="criteria"
                  type="checkbox"
                  value={criterion}
                />{" "}
                {criterion}
              </label>
            </p>
          ))}
        </fieldset>
        <p>
          <label htmlFor="rec-rationale">Rationale</label>{" "}
          <textarea
            id="rec-rationale"
            name="rationale"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending
              ? "Working…"
              : current.recommendation
                ? "Supersede with new version"
                : "Record recommendation"}
          </button>
        </p>
      </form>

      <h2>Release decision</h2>
      <p className={styles.supporting}>
        Authority: admissions approver workspace (decide-offer) · Scope:{" "}
        {current.offering.intake} · Evidence package: {current.policyVersion} /{" "}
        {current.requirementVersion}
        {current.recommendation ? (
          <>
            {" "}
            · Recommendation v{current.recommendation.version} (
            {current.recommendation.criteriaVersion})
          </>
        ) : (
          <> · No recommendation recorded yet — release will be refused</>
        )}
        . Separation of duties is enforced: the recommending officer cannot
        release. A released decision takes effect immediately and is never
        overwritten here.
      </p>
      {current.hasDecision ? (
        <Notice
          severity="info"
          title="Decision released"
          message="This case already has a released decision. It cannot be replaced from this screen."
        />
      ) : null}
      <form
        aria-label="Release a decision"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const conditions: Array<Record<string, unknown>> = [];
          for (const index of [1, 2]) {
            const text = String(
              data.get(`condition-${index}-text`) ?? "",
            ).trim();
            if (!text) continue;
            const day = String(data.get(`condition-${index}-day`) ?? "");
            const detail = String(
              data.get(`condition-${index}-detail`) ?? "",
            ).trim();
            conditions.push({
              text,
              detail: detail ? detail : null,
              owner: String(
                data.get(`condition-${index}-owner`) ?? "APPLICANT",
              ),
              deadline: day
                ? new Date(`${day}T17:00:00+02:00`).toISOString()
                : null,
              blocksMatriculation:
                data.get(`condition-${index}-blocks`) === "yes",
            });
          }
          submit(
            `/${current.applicationId}/decision/release`,
            {
              outcome: String(data.get("outcome") ?? "REQUEST_FURTHER_REVIEW"),
              message: String(data.get("decision-message") ?? ""),
              acceptBy: (() => {
                const day = String(data.get("accept-by-day") ?? "");
                return day
                  ? new Date(`${day}T17:00:00+02:00`).toISOString()
                  : "";
              })(),
              conditions,
            },
            "Decision released.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="release-outcome">Decision outcome</label>{" "}
          <select
            id="release-outcome"
            name="outcome"
            defaultValue="REQUEST_FURTHER_REVIEW"
          >
            <option value="ADMIT">Admit</option>
            <option value="ADMIT_WITH_CONDITIONS">Admit with conditions</option>
            <option value="WAITLIST">Waitlist</option>
            <option value="REJECT">Reject</option>
            <option value="REFER_TO_ALTERNATIVE_PROGRAMME">
              Refer to alternative programme
            </option>
            <option value="REQUEST_FURTHER_REVIEW">
              Request further review
            </option>
          </select>
        </p>
        <p className={styles.supporting}>
          Consequences: Admit opens an offer the applicant may accept; Admit
          with conditions adds the conditions below; Waitlist and Refer keep the
          applicant informed without a place; Reject closes this application;
          Request further review returns it to the queue without deciding.
        </p>
        <p>
          <label htmlFor="release-message">Authorized message</label>{" "}
          <textarea
            id="release-message"
            name="decision-message"
            rows={3}
            maxLength={2000}
            required
          />
        </p>
        <p>
          <label htmlFor="accept-by-day">
            Offer response deadline (CAT date)
          </label>{" "}
          <input id="accept-by-day" name="accept-by-day" type="date" required />
        </p>
        {[1, 2].map((index) => (
          <fieldset key={index}>
            <legend>Condition {index} (optional)</legend>
            <p>
              <label htmlFor={`condition-${index}-text`}>Text</label>{" "}
              <input
                id={`condition-${index}-text`}
                name={`condition-${index}-text`}
                type="text"
                maxLength={500}
              />
            </p>
            <p>
              <label htmlFor={`condition-${index}-detail`}>
                Why it is required (optional)
              </label>{" "}
              <input
                id={`condition-${index}-detail`}
                name={`condition-${index}-detail`}
                type="text"
                maxLength={500}
              />
            </p>
            <p>
              <label htmlFor={`condition-${index}-owner`}>Responsible</label>{" "}
              <select
                id={`condition-${index}-owner`}
                name={`condition-${index}-owner`}
                defaultValue="APPLICANT"
              >
                <option value="APPLICANT">Applicant</option>
                <option value="ADMISSIONS">Admissions</option>
                <option value="FINANCE">Finance</option>
                <option value="OTHER">Other office</option>
              </select>
            </p>
            <p>
              <label htmlFor={`condition-${index}-day`}>
                Deadline (CAT date)
              </label>{" "}
              <input
                id={`condition-${index}-day`}
                name={`condition-${index}-day`}
                type="date"
              />
            </p>
            <p>
              <label htmlFor={`condition-${index}-blocks`}>
                <input
                  id={`condition-${index}-blocks`}
                  name={`condition-${index}-blocks`}
                  type="checkbox"
                  value="yes"
                />{" "}
                Blocks registration until met
              </label>
            </p>
          </fieldset>
        ))}
        <p>
          <label htmlFor="release-declaration">
            <input
              id="release-declaration"
              name="release-declaration"
              type="checkbox"
              value="confirmed"
              required
            />{" "}
            I confirm that I have reviewed the stated evidence and make this
            decision within my assigned authority.
          </label>
        </p>
        <p>
          <button
            type="submit"
            disabled={pending || current.hasDecision}
            title={
              current.hasDecision
                ? "Unavailable: a decision is already released for this case."
                : undefined
            }
          >
            {pending ? "Working…" : "Release decision"}
          </button>
        </p>
        {current.hasDecision ? (
          <p className={styles.supporting}>
            Release is unavailable because a decision is already released.
          </p>
        ) : null}
      </form>

      <h2>Ask for clarification</h2>
      <form
        aria-label="Raise a clarification request"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          submit(
            `/${current.applicationId}/clarifications`,
            {
              question: String(data.get("question") ?? ""),
              deadlineDays: (() => {
                const days = Number(data.get("deadlineDays") ?? 14);
                return Number.isInteger(days) && days >= 1 && days <= 60
                  ? days
                  : 14;
              })(),
            },
            "Clarification raised. The applicant sees it in their inbox.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="clarify-question">Exact items needed</label>{" "}
          <textarea
            id="clarify-question"
            name="question"
            rows={3}
            maxLength={1000}
            required
          />
        </p>
        <p>
          <label htmlFor="clarify-days">Response deadline (days)</label>{" "}
          <input
            id="clarify-days"
            name="deadlineDays"
            type="number"
            min={1}
            max={60}
            defaultValue={14}
          />
        </p>
        <p>
          <button type="submit" disabled={pending}>
            {pending ? "Working…" : "Raise clarification"}
          </button>
        </p>
      </form>

      <h2>Case history</h2>
      <p className={styles.supporting}>
        Newest first, including staff-only rows the applicant never sees.
      </p>
      {history.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title="No history yet"
          message="Status events for this case will appear here."
        />
      ) : (
        <ol>
          {history.map((event) => (
            <li key={event.id}>
              <p>
                <strong>{event.label}</strong> · {event.code}
              </p>
              <p className={styles.supporting}>
                {formatLusaka(event.occurredAt)} · {event.actorRole} ·{" "}
                {event.applicantVisible
                  ? "Visible to applicant"
                  : "Staff only"}
              </p>
              {event.detail ? <p>{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      )}

      <h2>Pending corrections</h2>      {current.pendingCorrections.length === 0 ? (
        <Empty
          caseVariant="nothing"
          title="No pending corrections"
          message="Applicant correction requests awaiting a decision appear here."
        />
      ) : (
        <ul>
          {current.pendingCorrections.map((c) => (
            <li key={c.id}>
              <strong>
                {c.section} · {c.field}
              </strong>{" "}
              — requested {formatLusaka(c.createdAt)}
              <br />
              {c.reason}
              <form
                aria-label={`Decide correction ${c.section} ${c.field}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  decide(c.id, true, e.currentTarget);
                }}
              >
                <p>
                  <label htmlFor={`note-${c.id}`}>Decision note</label>{" "}
                  <input
                    id={`note-${c.id}`}
                    name={`note-${c.id}`}
                    type="text"
                    maxLength={500}
                  />
                </p>
                <p>
                  <button type="submit" disabled={pending}>
                    {pending ? "Working…" : "Approve"}
                  </button>{" "}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form");
                      if (form) decide(c.id, false, form as HTMLFormElement);
                    }}
                  >
                    {pending ? "Working…" : "Decline"}
                  </button>
                </p>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
