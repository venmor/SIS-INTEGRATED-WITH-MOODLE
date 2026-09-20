"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  ApplicationPolicy,
  ApplicationReview,
  ApplicationView,
  ApplicationSection,
  ApplicationError,
} from "@sis/contracts";
import { ActionButton, ErrorSummary } from "@sis/ui";
import { ApplicationContext, ApplicationSteps } from "./chrome";
import { applicantRequest, ApplicantRequestError, errorMessage } from "./api";
import { formatLusaka } from "../../lib/time";
import styles from "./applicant.module.css";
type Details = Record<string, unknown>;
export function StartForm({
  offeringId,
  policy,
}: {
  offeringId: string;
  policy: ApplicationPolicy;
}) {
  const router = useRouter(),
    key = useRef(crypto.randomUUID());
  const [offering, setOffering] = useState<Details | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  useEffect(() => {
    fetch(`/api/catalogue/offerings/${encodeURIComponent(offeringId)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Choose a published programme first.");
        setOffering(await r.json());
      })
      .catch((e) => setError(e.message));
  }, [offeringId]);
  async function start() {
    if (pending) return;
    setPending(true);
    try {
      const a = await applicantRequest<ApplicationView>("", {
        offeringId,
        confirmed: true,
        idempotencyKey: key.current,
      });
      router.push(`/applicant/${a.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <h1>Start an application</h1>
      <p className={styles.demo}>Fictional demonstration · {policy.version}</p>
      {error && (
        <ErrorSummary
          title="We could not start your application"
          errors={[{ fieldId: "start", message: error }]}
        />
      )}
      <section className={styles.card}>
        <h2>{String(offering?.programmeName ?? "Selected programme")}</h2>
        <p>
          {String(offering?.intake ?? "")} · {String(offering?.studyMode ?? "")}{" "}
          · {String(offering?.campus ?? "")}
        </p>
        <p>{policy.fee.explanation}</p>
        <p>
          You may create up to {policy.maxActivePerIntake} active applications
          per intake, with {policy.maxChoices} programme choice per application
          in this demonstration.
        </p>
        <p>
          You can save your progress and return later. Your application will not
          be sent until you review it and submit it.
        </p>
        <p>{policy.contactRequirement}</p>
        <div className={styles.actions}>
          <ActionButton
            id="start"
            type="button"
            kind="primary"
            pending={pending}
            disabled={!offering?.canStart}
            onClick={start}
          >
            Start application
          </ActionButton>
          <Link href="/discover">Choose a different programme</Link>
          <Link href="/applicant">Cancel</Link>
        </div>
      </section>
    </>
  );
}
export function Workspace({
  initial,
  section,
}: {
  initial: ApplicationReview;
  section: string;
}) {
  const router = useRouter();
  const [review, setReview] = useState(initial),
    [data, setData] = useState<Details>(
      () =>
        (initial.application[section as ApplicationSection] as Details) ?? {},
    ),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false),
    [dirty, setDirty] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [hasCommand, setHasCommand] = useState(false),
    [latest, setLatest] = useState<ApplicationReview | null>(null),
    [confirm, setConfirm] = useState(false),
    [accepted, setAccepted] = useState<Record<string, boolean>>({}),
    [newOffering, setNewOffering] = useState(""),
    [impact, setImpact] = useState<Details | null>(null),
    [offerings, setOfferings] = useState<
      { offeringId: string; programmeName: string; intake: string }[]
    >([]),
    [file, setFile] = useState<File | null>(null),
    [category, setCategory] = useState("qualification"),
    [reason, setReason] = useState(""),
    [progress, setProgress] = useState<number | null>(null);
  const command = useRef<{ path: string; body: Details } | null>(null),
    busy = useRef(false),
    uploadAbort = useRef<XMLHttpRequest | null>(null),
    autosaveRef = useRef<() => void>(() => {});
  const a = review.application,
    p = review.policy,
    formSection = ["personal", "contact", "qualifications"].includes(section);
  useEffect(() => {
    if (section === "programme")
      fetch("/api/catalogue/programmes?availability=OPEN&take=50")
        .then((r) => r.json())
        .then((r) => setOfferings(r.items ?? []))
        .catch(() =>
          setErrors({
            offering:
              "Programme catalogue is unavailable. Retry later; your current choice is preserved.",
          }),
        );
  }, [section]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirty || pending || uncertain) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending, uncertain]);
  useEffect(() => {
    function guardNavigation(event: MouseEvent) {
      if (
        !(dirty || pending || uncertain) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !target ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      )
        return;
      const destination = new URL(target.href, window.location.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      if (
        !window.confirm(
          "Your changes may not be saved. Stay here to save or check the result. Leave this page?",
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    document.addEventListener("click", guardNavigation, true);
    return () => document.removeEventListener("click", guardNavigation, true);
  }, [dirty, pending, uncertain]);
  async function reload() {
    const fresh = await applicantRequest<ApplicationReview>(`/${a.id}/review`);
    setReview(fresh);
    return fresh;
  }
  function update(key: string, value: unknown) {
    setData((old) => ({ ...old, [key]: value }));
    setDirty(true);
    setMessage("Changes not yet saved");
    command.current = null;
    setHasCommand(false);
  }
  async function run(path: string, body: Details): Promise<unknown> {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setErrors({});
    setMessage("Saving changes…");
    command.current ??= {
      path,
      body: { ...body, idempotencyKey: crypto.randomUUID() },
    };
    setHasCommand(true);
    try {
      const result = await applicantRequest<unknown>(
        command.current.path,
        command.current.body,
      );
      command.current = null;
      setHasCommand(false);
      setUncertain(false);
      setDirty(false);
      await reload();
      setMessage("All changes saved.");
      return result;
    } catch (e) {
      if (e instanceof ApplicantRequestError && e.status < 500) {
        command.current = null;
        setHasCommand(false);
        setUncertain(false);
        setErrors(e.detail.fieldErrors ?? { action: e.message });
        setMessage(e.message);
        if (e.detail.saved) {
          await reload();
        }
        if (e.detail.code === "VERSION_CONFLICT") {
          setLatest(
            await applicantRequest<ApplicationReview>(`/${a.id}/review`),
          );
        }
      } else {
        setUncertain(true);
        setMessage(errorMessage(e));
      }
      return undefined;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function checkResult() {
    if (!command.current) return;
    setPending(true);
    try {
      const r = await applicantRequest<{
        status: string;
        httpStatus?: number;
        response?: unknown;
      }>(`/commands/${command.current.body.idempotencyKey}`);
      if (r.status === "COMPLETED") {
        if ((r.httpStatus ?? 200) >= 400) {
          const d = r.response as ApplicationError;
          setErrors(d.fieldErrors ?? { action: d.message });
          setMessage(d.message);
        } else {
          setMessage("The server confirmed your action.");
          setDirty(false);
        }
        command.current = null;
        setHasCommand(false);
        setUncertain(false);
        await reload();
      } else {
        setMessage(
          "No completed result was found. Retry the same request safely.",
        );
      }
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  async function save(exit = false, autosave = false) {
    const routeChanged =
      section === "qualifications" &&
      a.qualifications.routeCode &&
      a.qualifications.routeCode !== data.routeCode;
    if (
      routeChanged &&
      !window.confirm(
        "Changing route retains older documents in history and requires current-route evidence again. Apply this change?",
      )
    )
      return;
    const result = await run(`/${a.id}/sections/${section}`, {
      version: a.version,
      data,
      complete: !autosave,
      confirmImpact: !!routeChanged,
    });
    if (result && exit) router.push(`/applicant/${a.id}`);
    else if (result && !autosave) {
      const next = (
        {
          personal: "contact",
          contact: "qualifications",
          qualifications: "documents",
        } as Record<string, string>
      )[section];
      if (next) router.push(`/applicant/${a.id}/${next}`);
    }
  }
  useEffect(() => {
    autosaveRef.current = () => {
      void save(false, true);
    };
  });
  // Only the non-sensitive reminder channel autosaves; personal and qualification data require deliberate save.
  useEffect(() => {
    if (
      section !== "contact" ||
      !dirty ||
      pending ||
      uncertain ||
      Object.keys(data).some((k) => k !== "preferredChannel")
    )
      return;
    const timer = setTimeout(() => autosaveRef.current(), p.autosaveDelayMs);
    return () =>
      clearTimeout(timer); /* state changes reschedule safe checkpoint */
  }, [data, dirty, pending, uncertain, section, p.autosaveDelayMs]);
  function field(
    key: string,
    label: string,
    type = "text",
    required = true,
    options?: string[],
  ) {
    return (
      <div className={styles.field} key={key}>
        <label htmlFor={key}>
          {label} {required ? "(required)" : "(optional)"}
        </label>
        {options ? (
          <select
            id={key}
            className={styles.select}
            value={String(data[key] ?? "")}
            disabled={pending || uncertain || !a.editable}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${key}-error` : undefined}
            onChange={(e) => update(key, e.target.value)}
          >
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input
            id={key}
            className={styles.input}
            type={type}
            value={String(data[key] ?? "")}
            disabled={pending || uncertain || !a.editable}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${key}-error` : undefined}
            maxLength={key === "address" ? 500 : 150}
            onChange={(e) =>
              update(
                key,
                type === "number"
                  ? e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        )}{" "}
        {errors[key] && (
          <p id={`${key}-error`} className={styles.error}>
            {errors[key]}
          </p>
        )}
      </div>
    );
  }
  async function upload() {
    if (!file || busy.current) return;
    const current = a.documents
      .filter((d) => d.category === category && d.status !== "Withdrawn")
      .at(-1);
    if (current && !reason.trim()) {
      setErrors({ reason: "Explain why you are replacing this document." });
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("Uploading document…");
    const body = new FormData();
    body.set("file", file);
    body.set("category", category);
    body.set("version", String(a.version));
    body.set("idempotencyKey", crypto.randomUUID());
    if (current) {
      body.set("replacesId", current.id);
      body.set("replacementReason", reason);
    }
    const xhr = new XMLHttpRequest();
    uploadAbort.current = xhr;
    xhr.open("POST", `/api/applications/${a.id}/documents`);
    xhr.timeout = 25000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = async () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setMessage(
            "Document received. Checking file safety is the next step.",
          );
          setFile(null);
          setDirty(false);
        } else {
          setErrors({
            file: response.message ?? "Upload could not be accepted.",
          });
          setMessage("Your other saved sections are unchanged.");
        }
        await reload();
      } finally {
        busy.current = false;
        setPending(false);
        setProgress(null);
      }
    };
    const failed = () => {
      setMessage(
        "Upload result is uncertain. Reload document status before choosing a replacement.",
      );
      setUncertain(true);
      busy.current = false;
      setPending(false);
      setProgress(null);
    };
    xhr.onerror = failed;
    xhr.ontimeout = failed;
    xhr.onabort = failed;
    xhr.send(body);
  }
  async function submit() {
    const result = await run(`/${a.id}/submit`, {
      version: a.version,
      confirmed: true,
      declarations: p.declarations.map((d) => ({
        id: d.id,
        version: d.version,
        accepted: !!accepted[d.id],
      })),
    });
    if (result) {
      router.replace(`/applicant/${a.id}/receipt`);
      router.refresh();
    }
  }
  function summary(values: Details) {
    return (
      <dl className={styles.summary}>
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd>
              {Array.isArray(value)
                ? value.map((v) => `${v.subject}: ${v.grade}`).join("; ")
                : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  if (a.receipt) {
    const receipt = a.receipt;
    return (
      <>
        <h1>Application submitted successfully</h1>
        <p>Reference: {receipt.reference}</p>
        <p>Submitted: {formatLusaka(receipt.submittedAt)}</p>
        <section className={styles.card}>
          <h2>Submission receipt</h2>
          <p>{receipt.institution}</p>
          <p>
            {receipt.applicantName} · {receipt.offering.programmeName} ·{" "}
            {receipt.offering.intake}
          </p>
          <p>
            Snapshot: {receipt.snapshotId} · Application version:{" "}
            {receipt.version}
          </p>
          <p>Payment: {receipt.paymentStatus.replaceAll("_", " ")}</p>
          <ul>
            {receipt.documents.map((d) => (
              <li key={d.category}>
                {d.category} ·{" "}
                {d.status === "AwaitingQualityCheck"
                  ? "Received; checking readability"
                  : d.status}{" "}
                · version {d.version}
              </li>
            ))}
          </ul>
          <p>{receipt.nextStep}</p>
          <p>Verification reference: {receipt.verificationReference}</p>
          <p>{receipt.help}</p>
        </section>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.print()}>
            Print or save receipt as PDF
          </button>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(receipt, null, 2))}`}
            download={`submission-${receipt.applicationId}.json`}
          >
            Download submission receipt
          </a>
          <Link href="/applicant">Return to applicant home</Link>
        </div>
      </>
    );
  }
  return (
    <>
      <h1>
        {(
          {
            overview: "Application overview",
            personal: "Personal details",
            contact: "Contact details",
            qualifications: "Qualifications and results",
            documents: "Supporting documents",
            review: "Review your application",
            programme: "Change programme",
          } as Record<string, string>
        )[section] ?? "Application"}
      </h1>
      <p className={styles.demo}>
        Fictional demonstration · {p.version} · {p.fee.explanation}
      </p>
      <ApplicationContext application={a} />
      <ApplicationSteps application={a} />
      {Object.keys(errors).length > 0 && (
        <ErrorSummary
          title="There are details to correct"
          errors={Object.entries(errors).map(([fieldId, message]) => ({
            fieldId,
            message,
          }))}
        />
      )}
      <p id="action" role="status" aria-live="polite">
        {message || `All changes saved at ${formatLusaka(a.updatedAt)}`}
      </p>
      {uncertain && (
        <div className={styles.card}>
          <p>
            We are checking whether your action completed. Do not create a new
            request.
          </p>
          <button
            disabled={pending}
            onClick={
              hasCommand
                ? checkResult
                : async () => {
                    await reload();
                    setUncertain(false);
                  }
            }
          >
            Check saved result
          </button>
          {hasCommand && (
            <button
              disabled={pending}
              onClick={() => run(command.current!.path, command.current!.body)}
            >
              Retry same request
            </button>
          )}
        </div>
      )}
      {latest && (
        <section className={styles.card}>
          <h2>Review differences</h2>
          <h3>Saved version {latest.application.version}</h3>
          {summary(
            (latest.application[section as ApplicationSection] as Details) ??
              {},
          )}
          <h3>Your unsaved changes</h3>
          {summary(data)}
          <button
            onClick={() => {
              setReview(latest);
              setData(
                (latest.application[
                  section as ApplicationSection
                ] as Details) ?? {},
              );
              setDirty(false);
              setLatest(null);
              setErrors({});
            }}
          >
            Use latest saved values
          </button>
          <button
            onClick={() => {
              setReview(latest);
              setLatest(null);
              setErrors({});
              setDirty(true);
              setMessage(
                "Your entered values are kept. Review them, then save deliberately.",
              );
            }}
          >
            Keep entered values for another save
          </button>
        </section>
      )}
      {section === "overview" && (
        <>
          <p>
            Choose a section above. Review remains available even while
            requirements are incomplete.
          </p>
          <Link href={`/applicant/${a.id}/review`}>Review and submit</Link>
          <Link href={`/applicant/${a.id}/programme`}>Change programme</Link>
          <details>
            <summary>Discard draft</summary>
            <p>
              This hides your unfinished draft. Retained audit records are not
              erased. You cannot undo it. {p.fee.explanation}
            </p>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              I confirm I want to discard this draft.
            </label>
            <button
              disabled={!confirm || pending}
              onClick={async () => {
                if (
                  await run(`/${a.id}/discard`, {
                    version: a.version,
                    confirmed: true,
                  })
                )
                  router.push("/applicant");
              }}
            >
              Discard draft
            </button>
          </details>
        </>
      )}
      {formSection && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          noValidate
        >
          <p>
            We use these details to process your application. Account security
            contacts are changed through a separate controlled process. Required
            information is labelled.
          </p>
          {section === "personal" && (
            <>
              {field("givenName", "Given name")}
              {field("familyName", "Family name")}
              {field("otherNames", "Other names", "text", false)}
              {field("preferredName", "Preferred name", "text", false)}
              {field("dateOfBirth", "Date of birth (year-month-day)", "date")}
              <p>
                Personal details are saved only when you deliberately select
                Save.
              </p>
            </>
          )}
          {section === "contact" && (
            <>
              <p>
                Account email: {a.verifiedContact.email ?? "Not provided"} ·{" "}
                {a.verifiedContact.emailVerified ? "Verified" : "Not verified"}
              </p>
              <p>
                Account mobile: {a.verifiedContact.phone ?? "Not provided"} ·{" "}
                {a.verifiedContact.phoneVerified ? "Verified" : "Not verified"}
              </p>
              {field("preferredChannel", "Reminder channel", "text", true, [
                "PORTAL",
                "EMAIL",
              ])}
              {field(
                "alternateEmail",
                "Alternate correspondence email",
                "email",
                false,
              )}
              {field("address", "Correspondence address", "text", false)}
              <p>
                Important messages may still use required channels. This form
                never changes or verifies your account contacts.
              </p>
            </>
          )}
          {section === "qualifications" && (
            <>
              <p>
                Declared — verification required. This form does not
                authenticate your qualification or make an admissions decision.
              </p>
              {field(
                "routeCode",
                "Qualification route",
                "text",
                true,
                p.routes.map((r) => r.code),
              )}
              <p>
                Changing route will retain your document history and require
                current-route evidence to be uploaded again.
              </p>
              {field("institution", "Awarding institution or examination body")}
              {field("awardTitle", "Award title")}
              {field("completionYear", "Completion year", "number")}
              {field(
                "status",
                "Qualification status",
                "text",
                true,
                p.qualifications.allowAwaiting
                  ? ["COMPLETED", "AWAITING"]
                  : ["COMPLETED"],
              )}
              {data.routeCode === "ECZ" && (
                <fieldset
                  id="subjects"
                  disabled={pending || uncertain || !a.editable || !!latest}
                >
                  <legend>
                    Subject results — use the published subject names and grades
                  </legend>
                  {(
                    (data.subjects as { subject: string; grade: number }[]) ??
                    []
                  ).map((r, i) => (
                    <div className={styles.resultRow} key={i}>
                      <label>
                        Subject {i + 1}
                        <select
                          className={styles.select}
                          value={r.subject}
                          onChange={(e) =>
                            update(
                              "subjects",
                              (data.subjects as Details[]).map((row, j) =>
                                j === i
                                  ? { ...row, subject: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        >
                          {p.qualifications.subjects.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Grade {i + 1}
                        <select
                          className={styles.select}
                          value={r.grade}
                          onChange={(e) =>
                            update(
                              "subjects",
                              (data.subjects as Details[]).map((row, j) =>
                                j === i
                                  ? { ...row, grade: Number(e.target.value) }
                                  : row,
                              ),
                            )
                          }
                        >
                          {p.qualifications.grades.map((g) => (
                            <option key={g}>{g}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            "subjects",
                            (data.subjects as Details[]).filter(
                              (_, j) => j !== i,
                            ),
                          )
                        }
                      >
                        Remove result {i + 1}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      update("subjects", [
                        ...((data.subjects as Details[]) ?? []),
                        {
                          subject:
                            p.qualifications.subjects.find(
                              (s) =>
                                !(data.subjects as Details[] | undefined)?.some(
                                  (r) => r.subject === s,
                                ),
                            ) ?? "",
                          grade: 1,
                        },
                      ])
                    }
                  >
                    Add subject result
                  </button>
                  {errors.subjects && (
                    <p className={styles.error}>{errors.subjects}</p>
                  )}
                </fieldset>
              )}
              {data.routeCode === "INTL" && (
                <p>
                  International qualifications may require equivalency
                  assessment. No automatic grade conversion is performed.
                </p>
              )}
            </>
          )}
          <div className={styles.actions}>
            <ActionButton
              kind="primary"
              pending={pending}
              disabled={!a.editable || uncertain || !!latest}
            >
              Save and continue
            </ActionButton>
            <button
              type="button"
              disabled={!a.editable || pending || uncertain || !!latest}
              onClick={() => save(true)}
            >
              Save and return later
            </button>
            <Link href={`/applicant/${a.id}`}>Back to overview</Link>
          </div>
        </form>
      )}
      {section === "documents" && (
        <>
          <p>
            Use clear, well-lit scans with every page and document edge visible.
            Avoid password-protected files. Accepted:{" "}
            {p.upload.extensions.join(", ")}; maximum{" "}
            {p.upload.maxBytes / 1024 / 1024} MB.
          </p>
          <p>
            Safety processor: {p.upload.scanner}. In fixture mode only the
            bundled fictional-result.pdf can pass. Arbitrary files stay
            quarantined until the required safety checks are available. PDFs
            also require structural validation.
          </p>
          {a.requiredDocuments.map((d) => (
            <article key={d.category} className={styles.card}>
              <h2>{d.label} — Required</h2>
              <p>{d.purpose}</p>
              {a.documents
                .filter((file) => file.category === d.category)
                .map((file) => (
                  <div key={file.id}>
                    <p>
                      {file.fileName} · {file.statusLabel} · version{" "}
                      {file.version}
                    </p>
                    {file.canPreview && (
                      <a
                        href={`/api/applications/${a.id}/documents/${file.id}/content`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Preview {file.fileName}
                      </a>
                    )}
                    {file.status === "SecurityScanPending" && (
                      <button
                        type="button"
                        disabled={pending || uncertain || !a.editable}
                        onClick={() =>
                          run(`/${a.id}/documents/${file.id}/scan`, {
                            version: a.version,
                          })
                        }
                      >
                        Check file safety
                      </button>
                    )}
                  </div>
                ))}
            </article>
          ))}
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              void upload();
            }}
          >
            <label htmlFor="category">
              Document category
              <select
                id="category"
                className={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {a.requiredDocuments.map((d) => (
                  <option key={d.category} value={d.category}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="file">
              Choose file
              <input
                id="file"
                type="file"
                accept={p.upload.mimeTypes.join(",")}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setDirty(true);
                }}
              />
            </label>
            <label htmlFor="reason">
              Reason for replacement (required when replacing)
              <input
                id="reason"
                className={styles.input}
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {progress !== null && (
              <>
                <progress
                  value={progress}
                  max={100}
                  aria-label="File upload progress"
                />
                <p>{progress}% uploaded</p>
                <button
                  type="button"
                  onClick={() => uploadAbort.current?.abort()}
                >
                  Cancel upload
                </button>
              </>
            )}
            <ActionButton
              kind="primary"
              pending={pending}
              disabled={!file || !a.editable || uncertain}
            >
              Upload document
            </ActionButton>
          </form>
        </>
      )}
      {section === "programme" && (
        <>
          <p>
            Changing programme retains personal/contact details, clears
            qualification readiness, and retains previous documents as withdrawn
            history. Review the new requirements, deadline and fee before
            confirming.
          </p>
          <label htmlFor="offering">
            New programme and intake
            <select
              id="offering"
              className={styles.select}
              value={newOffering}
              onChange={(e) => {
                setNewOffering(e.target.value);
                setImpact(null);
              }}
            >
              <option value="">Choose a programme…</option>
              {offerings.map((o) => (
                <option key={o.offeringId} value={o.offeringId}>
                  {o.programmeName} · {o.intake}
                </option>
              ))}
            </select>
          </label>
          <Link href="/discover" target="_blank">
            Find programme details in another tab
          </Link>
          <button
            onClick={async () => {
              const r = await fetch(
                `/api/catalogue/offerings/${encodeURIComponent(newOffering)}`,
              );
              if (r.ok) setImpact(await r.json());
              else setErrors({ offering: "Offering not found." });
            }}
          >
            Review change impact
          </button>
          {impact && (
            <section className={styles.card}>
              <h2>{String(impact.programmeName)}</h2>
              <p>
                {String(impact.intake)} · {String(impact.deadline)}
              </p>
              <ul>
                {(
                  (impact.entryRequirements as {
                    id: string;
                    label: string;
                  }[]) ?? []
                ).map((r) => (
                  <li key={r.id}>{r.label}</li>
                ))}
              </ul>
              <p>{p.fee.explanation}</p>
              <button
                disabled={pending || !impact.canStart}
                onClick={async () => {
                  if (
                    await run(`/${a.id}/change-programme`, {
                      version: a.version,
                      offeringId: newOffering,
                      confirmed: true,
                    })
                  )
                    router.push(`/applicant/${a.id}`);
                }}
              >
                Apply change
              </button>
            </section>
          )}
          <Link href={`/applicant/${a.id}`}>Keep current programme</Link>
        </>
      )}
      {section === "review" && (
        <>
          <p>
            Check the exact information below. After submission, Admissions
            receives this version and direct editing is locked.
          </p>
          {["personal", "contact", "qualifications"].map((s) => (
            <section key={s} className={styles.card}>
              <h2>
                {s === "personal"
                  ? "Personal details"
                  : s === "contact"
                    ? "Contact details"
                    : "Qualifications and results"}
              </h2>
              {summary(a[s as ApplicationSection] as Details)}
              <Link href={`/applicant/${a.id}/${s}`}>Edit {s}</Link>
            </section>
          ))}
          <section className={styles.card}>
            <h2>Supporting documents and fee</h2>
            {a.documents
              .filter((d) => d.status !== "Withdrawn")
              .map((d) => (
                <p key={d.id}>
                  {d.category} · {d.statusLabel}
                </p>
              ))}
            <p>{p.fee.explanation}</p>
            <Link href={`/applicant/${a.id}/documents`}>Review documents</Link>
          </section>
          {a.blockers.length > 0 && (
            <section className={styles.card}>
              <h2>Your application is not ready to submit yet</h2>
              <ul>
                {a.blockers.map((b, i) => (
                  <li key={i}>
                    <Link href={`/applicant/${a.id}/${b.section}`}>
                      {b.message}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={styles.card}>
            <h2>Confirm your application</h2>
            {p.declarations.map((d) => (
              <div key={d.id}>
                <label className={styles.checkboxLabel}>
                  <input
                    className={styles.checkbox}
                    type="checkbox"
                    checked={!!accepted[d.id]}
                    disabled={pending || uncertain}
                    onChange={(e) => {
                      setAccepted({ ...accepted, [d.id]: e.target.checked });
                      command.current = null;
                      setHasCommand(false);
                    }}
                  />
                  {d.text} (required)
                </label>
                <p className={styles.muted}>
                  {d.owner} · {d.version} · {d.effectiveDate}. {d.purpose}
                </p>
              </div>
            ))}
            {!confirm ? (
              <button
                disabled={
                  !review.ready || !p.declarations.every((d) => accepted[d.id])
                }
                onClick={() => setConfirm(true)}
              >
                Continue to submission confirmation
              </button>
            ) : (
              <div>
                <h3>Submit application?</h3>
                <p>
                  {a.offering.programmeName} · {a.offering.intake}. Admissions
                  will receive the version shown above. You may not edit it
                  directly after submission.
                </p>
                <ActionButton
                  kind="primary"
                  type="button"
                  pending={pending}
                  disabled={
                    !review.ready ||
                    uncertain ||
                    !p.declarations.every((d) => accepted[d.id])
                  }
                  onClick={submit}
                >
                  Submit application
                </ActionButton>
                <button disabled={pending} onClick={() => setConfirm(false)}>
                  Return to review
                </button>
              </div>
            )}
          </section>
        </>
      )}
      <p>{p.help}</p>
    </>
  );
}
