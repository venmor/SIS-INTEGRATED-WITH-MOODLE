"use client";
import staffUi from "../../staff-workspace.module.css";

import {
  useEffect,
  useId,
  useRef,
  useState,
  cloneElement,
  isValidElement,
  type FormEvent,
  type ReactNode,
} from "react";
import type {
  ActivateDemoUniversityCommand,
  DemoSetupValidationIssue,
  DemoUnitKind,
  DemoUnitRelationship,
  DemoUniversityProfile,
  DemoUniversitySetupReport,
  DemoUniversityVersion,
  SaveDemoUniversityCommand,
} from "@sis/contracts";
import { formatLusaka, formatLusakaDate } from "../../../../lib/time";
import styles from "./university.module.css";

const endpoint = "/api/institution-setup/demo-university";
const kinds: DemoUnitKind[] = [
  "INSTITUTION",
  "CAMPUS",
  "ACADEMIC",
  "ADMINISTRATIVE",
];
const relationships: DemoUnitRelationship[] = [
  "REPORTS_TO",
  "ACADEMICALLY_OWNED_BY",
  "DELIVERED_BY",
  "LOCATED_AT",
];
const kindLabel: Record<DemoUnitKind, string> = {
  INSTITUTION: "Institution",
  CAMPUS: "Campus",
  ACADEMIC: "Academic",
  ADMINISTRATIVE: "Administrative",
};
const relationshipLabel: Record<DemoUnitRelationship, string> = {
  REPORTS_TO: "Reports to",
  ACADEMICALLY_OWNED_BY: "Academically owned by",
  DELIVERED_BY: "Delivered by",
  LOCATED_AT: "Located at",
};
const clone = (profile: DemoUniversityProfile): DemoUniversityProfile =>
  JSON.parse(JSON.stringify(profile)) as DemoUniversityProfile;
const fieldNames: Record<string, string> = {
  code: "Code",
  label: "Label",
  kind: "Kind",
  name: "Name",
  typeCode: "Type",
  fromCode: "From",
  toCode: "To",
  type: "Relationship",
  parentCode: "Parent",
  startDate: "Start",
  endDate: "End",
  rootUnitCode: "Root unit",
  unitTypes: "Unit types",
  units: "Institution units",
  relationships: "Relationships",
  periodTypes: "Period types",
  periods: "Academic periods",
  reason: "Reason",
  clientRequestId: "Request reference",
  expectedVersion: "Latest draft",
  expectedActivationId: "Active version",
  contentDigest: "Saved content",
  confirmFictionalActivation: "Fictional scope",
  password: "Password",
};
type RowCollection = Exclude<
  DemoSetupValidationIssue["collection"],
  "profile" | "command"
>;
const collectionTitles: Record<DemoSetupValidationIssue["collection"], string> =
  {
    profile: "University details",
    unitTypes: "Unit types",
    units: "Institution units",
    relationships: "Relationships",
    periodTypes: "Period types",
    periods: "Academic periods",
    command: "Setup request",
  };
const issueFields: Record<
  DemoSetupValidationIssue["collection"],
  readonly string[]
> = {
  profile: [
    "name",
    "rootUnitCode",
    "unitTypes",
    "units",
    "relationships",
    "periodTypes",
    "periods",
  ],
  unitTypes: ["code", "label", "kind"],
  units: ["code", "name", "typeCode"],
  relationships: ["fromCode", "toCode", "type"],
  periodTypes: ["code", "label"],
  periods: ["code", "name", "typeCode", "parentCode", "startDate", "endDate"],
  command: [
    "clientRequestId",
    "expectedVersion",
    "expectedActivationId",
    "reason",
    "contentDigest",
    "confirmFictionalActivation",
    "password",
  ],
};
const collectionLimits: Record<RowCollection, number> = {
  unitTypes: 30,
  units: 200,
  relationships: 400,
  periodTypes: 30,
  periods: 100,
};
function issueOf(raw: unknown): DemoSetupValidationIssue | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.collection !== "string" ||
    !Object.hasOwn(issueFields, value.collection)
  )
    return;
  const collection = value.collection as DemoSetupValidationIssue["collection"];
  if (
    typeof value.field !== "string" ||
    !issueFields[collection].includes(value.field)
  )
    return;
  if (
    value.index !== undefined &&
    (collection === "profile" ||
      collection === "command" ||
      !Number.isInteger(value.index) ||
      (value.index as number) < 0 ||
      (value.index as number) >= collectionLimits[collection])
  )
    return;
  return {
    collection,
    field: value.field,
    ...(value.index === undefined ? {} : { index: value.index as number }),
  };
}
const fieldTarget = (
  collection: DemoSetupValidationIssue["collection"],
  field: string,
  index?: number,
) => `demo-setup-${collection}-${index ?? "root"}-${field}`;
const description = (row: object): string =>
  Object.entries(row)
    .map(([key, value]) => `${fieldNames[key] ?? key}: ${value ?? "none"}`)
    .join(" · ");

function Field({
  label,
  children,
  target,
  error,
}: {
  label: string;
  children: ReactNode;
  target?: string;
  error?: string;
}) {
  const generatedId = useId();
  const id = target ?? generatedId;
  return (
    <div className={styles.field}>
      <label className={staffUi.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {isValidElement<{
        id?: string;
        "aria-describedby"?: string;
        "aria-invalid"?: boolean;
        "data-setup-field"?: string;
      }>(children)
        ? cloneElement(children, {
            id,
            "data-setup-field": target,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error
              ? `${children.props["aria-describedby"] ?? ""} ${id}-error`.trim()
              : children.props["aria-describedby"],
          })
        : children}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

function PagedRows<T>({
  title,
  rows,
  add,
  remove,
  render,
  limit,
  initiallyOpen = false,
  collection,
  page,
  setPage,
}: {
  title: string;
  rows: T[];
  add: () => void;
  remove: (index: number) => void;
  render: (row: T, index: number) => ReactNode;
  limit: number;
  initiallyOpen?: boolean;
  collection: RowCollection;
  page: number;
  setPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * 10;
  return (
    <details
      id={`demo-setup-collection-${collection}`}
      className={styles.collection}
      open={initiallyOpen || undefined}
    >
      <summary
        className={staffUi.disclosure}
        id={`demo-setup-collection-${collection}-summary`}
      >
        {title} · {rows.length}
      </summary>
      <p className={styles.supporting}>
        Edit up to ten entries at a time. Codes link the structure and calendar.
      </p>
      <ol className={styles.rows} aria-label={title}>
        {rows.slice(start, start + 10).map((row, offset) => {
          const index = start + offset;
          return (
            <li key={index} className={styles.row}>
              <div className={styles.rowHeader}>
                <strong>
                  {title} · entry {index + 1}
                </strong>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${title.toLowerCase()} entry ${index + 1}`}
                >
                  Remove entry
                </button>
              </div>
              <div className={styles.fields}>{render(row, index)}</div>
            </li>
          );
        })}
      </ol>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          type="button"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
          aria-label={`Previous ${title.toLowerCase()} page`}
        >
          Previous
        </button>
        <span className={styles.meta}>
          Page {currentPage + 1} of {pages}
        </span>
        <button
          className={styles.secondary}
          type="button"
          disabled={currentPage + 1 === pages}
          onClick={() => setPage(currentPage + 1)}
          aria-label={`Next ${title.toLowerCase()} page`}
        >
          Next
        </button>
        <button
          className={styles.secondary}
          type="button"
          disabled={rows.length >= limit}
          onClick={() => {
            add();
            setPage(Math.floor(rows.length / 10));
          }}
        >
          Add {title.toLowerCase().replace(/s$/, "")}
        </button>
      </div>
      {rows.length >= limit && (
        <p className={styles.meta}>
          This rehearsal supports up to {limit} {title.toLowerCase()}.
        </p>
      )}
    </details>
  );
}

function ProfileReview({ profile }: { profile: DemoUniversityProfile }) {
  const groups = [
    {
      title: "Unit types",
      rows: profile.unitTypes.map((row) => ({
        key: row.code,
        title: `${row.code} · ${row.label}`,
        detail: `Kind: ${kindLabel[row.kind]}`,
      })),
    },
    {
      title: "Institution units",
      rows: profile.units.map((row) => ({
        key: row.code,
        title: `${row.code} · ${row.name}`,
        detail: `Type: ${row.typeCode}`,
      })),
    },
    {
      title: "Relationships",
      rows: profile.relationships.map((row) => ({
        key: `${row.fromCode}:${row.toCode}:${row.type}`,
        title: `${row.fromCode} → ${row.toCode}`,
        detail: relationshipLabel[row.type],
      })),
    },
    {
      title: "Period types",
      rows: profile.periodTypes.map((row) => ({
        key: row.code,
        title: `${row.code} · ${row.label}`,
        detail: "Configured period type",
      })),
    },
    {
      title: "Academic periods",
      rows: profile.periods.map((row) => ({
        key: row.code,
        title: `${row.code} · ${row.name}`,
        detail: `${row.typeCode} · Parent: ${row.parentCode ?? "none"} · ${formatLusakaDate(row.startDate)} to ${formatLusakaDate(row.endDate)}`,
      })),
    },
  ];
  return (
    <div>
      <p>
        <strong>{profile.name}</strong> · Root unit: {profile.rootUnitCode}
      </p>
      {groups.map((group) => (
        <ReviewCollection
          key={group.title}
          title={group.title}
          rows={group.rows}
        />
      ))}
    </div>
  );
}

function ReviewCollection({
  title,
  rows,
  initiallyOpen = false,
}: {
  title: string;
  rows: { key: string; title: string; detail: string }[];
  initiallyOpen?: boolean;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages - 1);
  return (
    <details className={styles.collection} open={initiallyOpen || undefined}>
      <summary className={staffUi.disclosure}>
        {title} · {rows.length}
      </summary>
      <ul className={styles.reviewRows}>
        {rows.slice(current * 10, current * 10 + 10).map((row) => (
          <li key={row.key}>
            <strong>{row.title}</strong>
            <span>{row.detail}</span>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={`Previous saved ${title.toLowerCase()} page`}
          >
            Previous
          </button>
          <span className={styles.meta}>
            Page {current + 1} of {pages}
          </span>
          <button
            type="button"
            className={styles.secondary}
            disabled={current + 1 === pages}
            onClick={() => setPage(current + 1)}
            aria-label={`Next saved ${title.toLowerCase()} page`}
          >
            Next
          </button>
        </div>
      )}
    </details>
  );
}

function profileChanges(
  before: DemoUniversityProfile | null,
  after: DemoUniversityProfile,
) {
  const changes: Array<{
    title: string;
    before: string | null;
    after: string | null;
  }> = [];
  for (const key of ["name", "rootUnitCode"] as const) {
    if (before?.[key] !== after[key])
      changes.push({
        title: key === "name" ? "University name" : "Root unit",
        before: before?.[key] ?? null,
        after: after[key],
      });
  }
  for (const key of [
    "unitTypes",
    "units",
    "relationships",
    "periodTypes",
    "periods",
  ] as const) {
    const labels = {
      unitTypes: "Unit type",
      units: "Unit",
      relationships: "Relationship",
      periodTypes: "Period type",
      periods: "Period",
    };
    const rowsBefore: object[] = before?.[key] ?? [];
    const rowsAfter: object[] = after[key];
    const identify = (row: object) =>
      "code" in row ? String(row.code) : description(row);
    const old = new Map(rowsBefore.map((row) => [identify(row), row]));
    const current = new Map(rowsAfter.map((row) => [identify(row), row]));
    for (const [id, row] of current) {
      const previous = old.get(id);
      if (JSON.stringify(previous) !== JSON.stringify(row))
        changes.push({
          title: `${labels[key]} · ${id}`,
          before: previous ? description(previous) : null,
          after: description(row),
        });
    }
    for (const [id, row] of old)
      if (!current.has(id))
        changes.push({
          title: `${labels[key]} · ${id}`,
          before: description(row),
          after: null,
        });
  }
  return changes;
}

async function bodyOf(response: Response): Promise<{
  message?: string | string[];
  id?: string;
  version?: number;
  code?: string;
  issue?: DemoSetupValidationIssue;
}> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      id?: string;
      version?: number;
      code?: string;
      issue?: unknown;
    };
    return { ...body, issue: issueOf(body.issue) };
  } catch {
    return {};
  }
}
const errorMessage = (
  body: { message?: string | string[] },
  fallback: string,
) =>
  Array.isArray(body.message)
    ? body.message.join(" ")
    : (body.message ?? fallback);

export function UniversitySetupEditor({
  initialReport,
}: {
  initialReport: DemoUniversitySetupReport;
}) {
  const [report, setReport] = useState(initialReport);
  const initialProfile =
    initialReport.activeVersion?.profile ?? initialReport.template;
  const [profile, setProfile] = useState(() => clone(initialProfile));
  const [baseline, setBaseline] = useState(JSON.stringify(initialProfile));
  const [base, setBase] = useState({
    version: initialReport.latestVersion,
    activationId: initialReport.activeActivationId,
  });
  const [reason, setReason] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [historyBatch, setHistoryBatch] = useState(0);
  const [historyCursors, setHistoryCursors] = useState<(number | undefined)[]>([
    undefined,
  ]);
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<
    "save" | "activate" | "refresh" | null
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [validationIssue, setValidationIssue] =
    useState<DemoSetupValidationIssue | null>(null);
  const [collectionPages, setCollectionPages] = useState<
    Record<RowCollection, number>
  >({
    unitTypes: 0,
    units: 0,
    relationships: 0,
    periodTypes: 0,
    periods: 0,
  });
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);
  const [saveUncertain, setSaveUncertain] = useState(false);
  const [activationUncertain, setActivationUncertain] = useState(false);
  const [saveReference, setSaveReference] = useState("");
  const [activationReference, setActivationReference] = useState("");
  const saveIntent = useRef<{
    signature: string;
    body: SaveDemoUniversityCommand;
  } | null>(null);
  const activationIntent = useRef<{
    signature: string;
    command: Omit<ActivateDemoUniversityCommand, "password">;
    versionId: string;
  } | null>(null);
  const dirty =
    JSON.stringify(profile) !== baseline || reason.trim().length > 0;
  const active = report.activeVersion;
  const reviewVersions =
    active && !report.versions.some((row) => row.id === active.id)
      ? [active, ...report.versions]
      : report.versions;
  const selected = reviewVersions.find((row) => row.id === selectedId) ?? null;
  const isCurrent = selected?.activation?.id === report.activeActivationId;
  const stale =
    selected !== null &&
    selected.baseActivationId !== report.activeActivationId;
  const changes = selected
    ? profileChanges(active?.profile ?? null, selected.profile)
    : [];
  const editLocked = pending !== null || saveUncertain || activationUncertain;

  useEffect(() => {
    if (!focusRequest) return;
    const control = document.getElementById(focusRequest.id);
    if (!control) return;
    control.focus();
    control.scrollIntoView({ block: "center", behavior: "auto" });
  }, [focusRequest]);

  function clearValidation() {
    if (!validationIssue) return;
    setValidationIssue(null);
    setError("");
  }
  function validationField(
    collection: DemoSetupValidationIssue["collection"],
    field: string,
    index?: number,
  ) {
    const target = fieldTarget(collection, field, index);
    const matches =
      validationIssue?.collection === collection &&
      validationIssue.field === field &&
      validationIssue.index === index;
    return { target, error: matches ? error : undefined };
  }
  function setCollectionPage(collection: RowCollection, page: number) {
    setCollectionPages((current) => ({ ...current, [collection]: page }));
  }
  function showField() {
    if (!validationIssue) return;
    let { collection } = validationIssue;
    const { field, index } = validationIssue;
    if (collection === "profile" && Object.hasOwn(collectionLimits, field))
      collection = field as RowCollection;
    let target: string;
    if (collection !== "profile" && collection !== "command") {
      const details = document.getElementById(
        `demo-setup-collection-${collection}`,
      );
      if (details instanceof HTMLDetailsElement) details.open = true;
      setCollectionPage(collection, Math.floor((index ?? 0) / 10));
      target =
        index === undefined
          ? `demo-setup-collection-${collection}-summary`
          : fieldTarget(collection, field, index);
    } else if (
      collection === "command" &&
      !["reason", "password", "confirmFictionalActivation"].includes(field)
    ) {
      target = "demo-setup-check-history";
    } else target = fieldTarget(collection, field, index);
    setFocusRequest({ id: target });
  }
  const validationLabel = validationIssue
    ? `${collectionTitles[validationIssue.collection]}${validationIssue.index === undefined ? "" : ` · entry ${validationIssue.index + 1}`} · ${fieldNames[validationIssue.field] ?? validationIssue.field}`
    : "";

  useEffect(() => {
    if (!dirty && !saveUncertain && !activationUncertain) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        anchor?.href &&
        anchor.getAttribute("href")?.startsWith("#") !== true &&
        !anchor.hasAttribute("download") &&
        !window.confirm(
          activationUncertain || saveUncertain
            ? "Leave with an unresolved setup request? Keep its request reference before leaving."
            : "Leave this page and discard your unsaved setup changes?",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty, saveUncertain, activationUncertain]);

  function selectVersion(id: string) {
    if (activationUncertain) return;
    clearValidation();
    setSelectedId(id);
    setReviewed(false);
    setConfirmed(false);
    setPassword("");
    setActivationUncertain(false);
    activationIntent.current = null;
  }

  async function refresh(cursor?: number, resetHistory = true) {
    let response: Response;
    const failureMessage =
      "Version history could not be checked. Your entries are still on this page.";
    try {
      response = await fetch(
        `${endpoint}${cursor === undefined ? "" : `?beforeVersion=${cursor}`}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
        },
      );
    } catch {
      throw new Error(failureMessage);
    }
    if (!response.ok) throw new Error(failureMessage);
    let current: DemoUniversitySetupReport;
    try {
      current = (await response.json()) as DemoUniversitySetupReport;
    } catch {
      throw new Error(failureMessage);
    }
    setReport(current);
    if (resetHistory) {
      setHistoryBatch(0);
      setHistoryCursors([undefined]);
      setHistoryPage(0);
    }
    const unresolved = activationIntent.current;
    const recorded =
      unresolved &&
      [current.activeVersion, ...current.versions].find(
        (version) => version?.id === unresolved.versionId && version.activation,
      );
    if (recorded) {
      setActivationUncertain(false);
      activationIntent.current = null;
    }
    setPassword("");
    setReviewed(false);
    setConfirmed(false);
    return current;
  }

  async function checkHistory() {
    setPending("refresh");
    setError("");
    setValidationIssue(null);
    try {
      const wasUncertain = activationUncertain;
      await refresh();
      setMessage(
        wasUncertain && !activationIntent.current
          ? "The activation is recorded. Its outcome is resolved."
          : "Version history checked. Review the saved version before continuing.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Version history could not be checked.",
      );
    } finally {
      setPending(null);
    }
  }

  async function historyBatchAt(cursor: number | undefined, batch: number) {
    if (activationUncertain || pending !== null) return;
    setPending("refresh");
    setError("");
    setValidationIssue(null);
    try {
      await refresh(cursor, false);
      if (batch > historyBatch)
        setHistoryCursors([
          ...historyCursors.slice(0, historyBatch + 1),
          cursor,
        ]);
      setHistoryBatch(batch);
      setHistoryPage(0);
      selectVersion("");
      setMessage("Saved versions loaded. Your draft entries are retained.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Version history could not be checked.",
      );
    } finally {
      setPending(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setError("");
    setValidationIssue(null);
    setMessage("");
    const input = {
      expectedVersion: base.version,
      expectedActivationId: base.activationId,
      reason: reason.trim(),
      profile,
    };
    const signature = JSON.stringify(input);
    if (
      !saveIntent.current ||
      (!saveUncertain && saveIntent.current.signature !== signature)
    )
      saveIntent.current = {
        signature,
        body: { ...input, clientRequestId: crypto.randomUUID() },
      };
    const intent = saveIntent.current;
    setSaveReference(intent.body.clientRequestId);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(intent.body),
        signal: AbortSignal.timeout(30000),
      });
      const body = await bodyOf(response);
      if (!response.ok) {
        setSaveUncertain(response.status >= 500);
        const issue = response.status === 400 ? (body.issue ?? null) : null;
        setValidationIssue(issue);
        if (issue) setFocusRequest({ id: "demo-setup-validation-summary" });
        setError(
          errorMessage(
            body,
            "The draft could not be saved. Check your entries and current version.",
          ),
        );
        return;
      }
      setSaveUncertain(false);
      setBaseline(JSON.stringify(intent.body.profile));
      setReason("");
      setMessage(
        `Draft saved as version ${body.version}. Another person must review and activate it.`,
      );
      try {
        const current = await refresh();
        setBase({
          version: current.latestVersion,
          activationId: current.activeActivationId,
        });
        selectVersion(body.id ?? "");
      } catch {
        setError(
          "The draft was saved, but history could not be refreshed. Check history before starting another version.",
        );
      }
      saveIntent.current = null;
    } catch {
      setSaveUncertain(true);
      setError(
        "The save outcome is uncertain. Check history or retry this same draft reference. Your entries are retained.",
      );
    } finally {
      setPending(null);
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reviewed || !confirmed || !password) return;
    setPending("activate");
    setError("");
    setValidationIssue(null);
    setMessage("");
    const command = {
      contentDigest: selected.contentDigest,
      expectedActivationId: selected.baseActivationId,
      confirmFictionalActivation: true as const,
    };
    const signature = JSON.stringify({ id: selected.id, ...command });
    if (
      !activationIntent.current ||
      activationIntent.current.signature !== signature
    )
      activationIntent.current = {
        signature,
        versionId: selected.id,
        command: { ...command, clientRequestId: crypto.randomUUID() },
      };
    const intent = activationIntent.current;
    setActivationReference(intent.command.clientRequestId);
    try {
      const response = await fetch(`${endpoint}/${intent.versionId}/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...intent.command, password }),
        signal: AbortSignal.timeout(30000),
      });
      const body = await bodyOf(response);
      if (!response.ok) {
        setActivationUncertain(activationUncertain || response.status >= 500);
        const issue = response.status === 400 ? (body.issue ?? null) : null;
        setValidationIssue(issue);
        if (issue) setFocusRequest({ id: "demo-setup-validation-summary" });
        setError(
          errorMessage(
            body,
            "Activation was not confirmed. Check this version and your authority.",
          ),
        );
        return;
      }
      setActivationUncertain(false);
      setReviewed(false);
      setConfirmed(false);
      activationIntent.current = null;
      setMessage(
        `Version ${selected.version} activated for the fictional rehearsal. Owner handoffs remain separate.`,
      );
      try {
        await refresh();
      } catch {
        setError(
          "Activation was confirmed, but history could not be refreshed. Check history to see the current active version.",
        );
      }
    } catch {
      setActivationUncertain(true);
      setError(
        "The activation outcome is uncertain. Check history before retrying with this same reference.",
      );
    } finally {
      setPassword("");
      setPending(null);
    }
  }

  function resetDraft(source: DemoUniversityProfile) {
    if (dirty && !window.confirm("Replace your unsaved setup entries?")) return;
    clearValidation();
    setProfile(clone(source));
    setBaseline(JSON.stringify(source));
    setReason("");
    setBase({
      version: report.latestVersion,
      activationId: report.activeActivationId,
    });
    saveIntent.current = null;
    setSaveUncertain(false);
  }

  function editRow<
    K extends
      "unitTypes" | "units" | "relationships" | "periodTypes" | "periods",
  >(
    collection: K,
    index: number,
    patch: Partial<DemoUniversityProfile[K][number]>,
  ) {
    clearValidation();
    setProfile((current) => ({
      ...current,
      [collection]: current[collection].map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    }));
  }
  function removeRow(
    collection:
      "unitTypes" | "units" | "relationships" | "periodTypes" | "periods",
    index: number,
  ) {
    clearValidation();
    setProfile((current) => ({
      ...current,
      [collection]: current[collection].filter(
        (_, rowIndex) => rowIndex !== index,
      ),
    }));
  }
  const options = (rows: { code: string; name?: string; label?: string }[]) =>
    rows.map((row, index) => (
      <option key={`${index}:${row.code}`} value={row.code}>
        {row.code} · {row.name ?? row.label}
      </option>
    ));

  return (
    <div className={styles.stack}>
      <section className={styles.panel} aria-labelledby="setup-state">
        <div className={styles.header}>
          <div>
            <h2 className={staffUi.sectionHeading} id="setup-state">
              {active ? "Fictional setup active" : "No active setup version"}
            </h2>
            <p className={styles.supporting}>
              {active
                ? "The installed structure and calendar use this approved fictional version."
                : "Save a draft, then ask the independent policy approver to review it."}
            </p>
          </div>
          <button
            id="demo-setup-check-history"
            type="button"
            className={styles.secondary}
            onClick={checkHistory}
            disabled={pending !== null}
          >
            {pending === "refresh" ? "Checking history…" : "Check history"}
          </button>
        </div>
        <dl className={styles.status}>
          <div>
            <dt>Scope</dt>
            <dd>DEMO-UNIVERSITY</dd>
          </div>
          <div>
            <dt>Active version</dt>
            <dd>{active ? `Version ${active.version}` : "Not activated"}</dd>
          </div>
          <div>
            <dt>Policy</dt>
            <dd>{report.policyVersion}</dd>
          </div>
          {active?.activation && (
            <div>
              <dt>Approved by</dt>
              <dd>
                {active.activation.approvedByName} ·{" "}
                {formatLusaka(active.activation.approvedAt)}
              </dd>
            </div>
          )}
        </dl>
        <p className={styles.notice}>
          Fictional rehearsal only. Activating structure and calendar does not
          approve course registrations, fees, results or a timetable.
        </p>
        {error && (
          <div
            id="demo-setup-validation-summary"
            tabIndex={-1}
            role="alert"
            className={styles.error}
          >
            {validationLabel && <strong>{validationLabel}</strong>}
            <p>{error}</p>
            {validationIssue && (
              <>
                <p>Your entries are kept.</p>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={showField}
                  disabled={pending !== null}
                >
                  Show field
                </button>
              </>
            )}
          </div>
        )}
        <p role="status" aria-live="polite">
          {pending === "save"
            ? "Saving the draft…"
            : pending === "activate"
              ? "Checking authority and activating…"
              : message}
        </p>
        {saveUncertain && (
          <p className={styles.meta}>
            Your original draft reference is retained. Editing is paused until
            that save is resolved.
          </p>
        )}
        {activationUncertain && (
          <p className={styles.meta}>
            Your activation reference is retained. Re-enter your password only
            after checking history. Request reference: {activationReference}
          </p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="version-review">
        <h2 className={staffUi.sectionHeading} id="version-review">
          Review a saved version
        </h2>
        <p className={styles.supporting}>
          Select the exact stored version. A proposal stays a draft until
          another person activates it.
        </p>
        <Field label="Saved version">
          <select
            className={staffUi.control}
            value={selectedId}
            onChange={(event) => selectVersion(event.target.value)}
            disabled={pending !== null || activationUncertain}
          >
            <option value="">Choose a saved version</option>
            {reviewVersions.map((row) => (
              <option key={row.id} value={row.id}>
                Version {row.version} ·{" "}
                {row.activation?.id === report.activeActivationId
                  ? "Active"
                  : row.activation
                    ? "Previously active"
                    : "Draft"}{" "}
                · {row.createdByName}
              </option>
            ))}
          </select>
        </Field>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={
              pending !== null || activationUncertain || historyBatch === 0
            }
            onClick={() =>
              historyBatchAt(historyCursors[historyBatch - 1], historyBatch - 1)
            }
          >
            Newer versions
          </button>
          <span className={styles.meta}>
            History page {historyBatch + 1} · up to 20 versions
          </span>
          <button
            type="button"
            className={styles.secondary}
            disabled={
              pending !== null ||
              activationUncertain ||
              report.olderVersionCursor === null
            }
            onClick={() =>
              historyBatchAt(
                report.olderVersionCursor ?? undefined,
                historyBatch + 1,
              )
            }
          >
            Older versions
          </button>
        </div>
        {selected && (
          <div>
            <h3 className={styles.collection}>
              Version {selected.version} ·{" "}
              {isCurrent
                ? "Active"
                : selected.activation
                  ? "Previously active"
                  : "Draft"}
            </h3>
            <p className={styles.meta}>
              Prepared by {selected.createdByName} ·{" "}
              {formatLusaka(selected.createdAt)}
            </p>
            <p>
              <strong>Reason:</strong> {selected.reason}
            </p>
            <p className={styles.meta}>
              Exact saved content reference
              <code className={styles.digest}>{selected.contentDigest}</code>
            </p>
            <ProfileReview key={selected.id} profile={selected.profile} />
            <ReviewCollection
              key={`changes:${selected.id}:${active?.id ?? "none"}`}
              initiallyOpen
              title={`Changes against ${active ? `active version ${active.version}` : "no active version"}`}
              rows={changes.map((change, index) => ({
                key: String(index),
                title: change.title,
                detail: `${change.before === null ? "Added" : change.after === null ? "Removed" : "Changed"}${change.before !== null ? ` · Before: ${change.before}` : ""}${change.after !== null ? ` · After: ${change.after}` : ""}`,
              }))}
            />
            {changes.length === 0 && (
              <p className={styles.meta}>
                The structure and calendar match the active version.
              </p>
            )}
            {selected.activation ? (
              <p className={styles.notice}>
                {isCurrent
                  ? "This version is already active."
                  : "This version is historical. Make a new proposal to change the current setup."}
              </p>
            ) : selected.ownProposal ? (
              <p className={styles.notice}>
                You prepared this proposal. An independent person must approve
                it.
              </p>
            ) : stale ? (
              <p className={styles.notice}>
                The active setup changed after this draft was prepared. The
                proposer must save a new version based on the current
                activation.
              </p>
            ) : report.canApprove ? (
              <form className={staffUi.form} onSubmit={activate}>
                <p className={styles.notice}>
                  Approval immediately installs this version for the fictional
                  university. Existing academic decisions stay unchanged; owner
                  reconciliation remains pending.
                </p>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                    disabled={pending !== null}
                  />
                  I have reviewed this exact saved version and its changes.
                </label>
                <label className={styles.check}>
                  <input
                    id={fieldTarget("command", "confirmFictionalActivation")}
                    aria-invalid={
                      validationIssue?.collection === "command" &&
                      validationIssue.field === "confirmFictionalActivation"
                        ? true
                        : undefined
                    }
                    aria-describedby={
                      validationIssue?.collection === "command" &&
                      validationIssue.field === "confirmFictionalActivation"
                        ? `${fieldTarget("command", "confirmFictionalActivation")}-error`
                        : undefined
                    }
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => {
                      clearValidation();
                      setConfirmed(event.target.checked);
                    }}
                    disabled={pending !== null}
                  />
                  I confirm activation is for the fictional rehearsal within my
                  assigned authority.
                </label>
                {validationIssue?.collection === "command" &&
                  validationIssue.field === "confirmFictionalActivation" && (
                    <p
                      className={styles.fieldError}
                      id={`${fieldTarget("command", "confirmFictionalActivation")}-error`}
                    >
                      {error}
                    </p>
                  )}
                <div className={styles.fields}>
                  <Field
                    label="Confirm your password"
                    {...validationField("command", "password")}
                  >
                    <input
                      className={staffUi.control}
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        clearValidation();
                        setPassword(event.target.value);
                      }}
                      aria-describedby="approval-auth"
                      required
                      disabled={pending !== null}
                    />
                  </Field>
                </div>
                <p id="approval-auth" className={styles.meta}>
                  Password reconfirmation is used only for this demo approval.
                  It is cleared after the attempt.
                </p>
                <div className={styles.actions}>
                  <button
                    type="submit"
                    className={styles.primary}
                    disabled={
                      pending !== null || !reviewed || !confirmed || !password
                    }
                  >
                    {pending === "activate"
                      ? "Activating…"
                      : activationUncertain
                        ? "Retry activation"
                        : "Approve and activate"}
                  </button>
                </div>
                {(!reviewed || !confirmed) && (
                  <p className={styles.meta}>
                    Review the saved version and confirm the fictional scope to
                    enable approval.
                  </p>
                )}
              </form>
            ) : (
              <p className={styles.notice}>
                Your appointment does not include setup approval.
              </p>
            )}
          </div>
        )}
        {report.versions.length === 0 && (
          <p className={styles.meta}>No saved versions yet.</p>
        )}
      </section>

      {report.canPropose && (
        <form
          className={styles.panel}
          onSubmit={save}
          aria-labelledby="draft-editor"
        >
          <div className={styles.header}>
            <div>
              <h2 className={staffUi.sectionHeading} id="draft-editor">
                Prepare a draft
              </h2>
              <p className={styles.supporting}>
                Use codes to connect units and periods. Saving does not activate
                your changes.
              </p>
            </div>
            <div className={styles.actions}>
              {active && (
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => resetDraft(active.profile)}
                  disabled={editLocked}
                >
                  Start from active
                </button>
              )}
              <button
                className={styles.secondary}
                type="button"
                onClick={() => resetDraft(report.template)}
                disabled={editLocked}
              >
                Use example structure
              </button>
            </div>
          </div>
          <p className={styles.meta}>
            Based on{" "}
            {base.activationId
              ? "the activation shown when editing began"
              : "no active version"}{" "}
            · expected preceding draft: {base.version}.{" "}
            {dirty ? "Unsaved changes" : "Ready to edit"}
          </p>
          {(base.version !== report.latestVersion ||
            base.activationId !== report.activeActivationId) && (
            <div className={styles.notice}>
              Newer setup history is available. Your entries are retained.
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={editLocked}
                  onClick={() =>
                    setBase({
                      version: report.latestVersion,
                      activationId: report.activeActivationId,
                    })
                  }
                >
                  Use latest base
                </button>
              </div>
            </div>
          )}
          <fieldset className={styles.editorFields} disabled={editLocked}>
            <legend className="sr-only">Fictional setup fields</legend>
            <p className={styles.meta}>
              All fields are required unless marked optional. Unit and period
              codes begin with DEMO-. Type codes use uppercase letters.
            </p>
            <div className={styles.fields}>
              <Field
                label="University name"
                {...validationField("profile", "name")}
              >
                <input
                  className={staffUi.control}
                  value={profile.name}
                  onChange={(event) => {
                    clearValidation();
                    setProfile({ ...profile, name: event.target.value });
                  }}
                  required
                  maxLength={120}
                />
              </Field>
              <Field
                label="Root unit"
                {...validationField("profile", "rootUnitCode")}
              >
                <select
                  className={staffUi.control}
                  value={profile.rootUnitCode}
                  onChange={(event) => {
                    clearValidation();
                    setProfile({
                      ...profile,
                      rootUnitCode: event.target.value,
                    });
                  }}
                  required
                >
                  <option value="">Choose root unit</option>
                  {options(
                    profile.units.filter(
                      (unit) =>
                        profile.unitTypes.find(
                          (type) => type.code === unit.typeCode,
                        )?.kind === "INSTITUTION",
                    ),
                  )}
                </select>
              </Field>
            </div>
            <PagedRows
              title="Unit types"
              collection="unitTypes"
              page={collectionPages.unitTypes}
              setPage={(page) => setCollectionPage("unitTypes", page)}
              rows={profile.unitTypes}
              limit={30}
              add={() =>
                setProfile({
                  ...profile,
                  unitTypes: [
                    ...profile.unitTypes,
                    { code: "", label: "", kind: "ACADEMIC" },
                  ],
                })
              }
              remove={(index) => removeRow("unitTypes", index)}
              render={(row, index) => (
                <>
                  <Field
                    label={`Type code ${index + 1}`}
                    {...validationField("unitTypes", "code", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.code}
                      onChange={(event) =>
                        editRow("unitTypes", index, {
                          code: event.target.value,
                        })
                      }
                      required
                      maxLength={40}
                    />
                  </Field>
                  <Field
                    label={`Type label ${index + 1}`}
                    {...validationField("unitTypes", "label", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.label}
                      onChange={(event) =>
                        editRow("unitTypes", index, {
                          label: event.target.value,
                        })
                      }
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    label={`Unit kind ${index + 1}`}
                    {...validationField("unitTypes", "kind", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.kind}
                      onChange={(event) =>
                        editRow("unitTypes", index, {
                          kind: event.target.value as DemoUnitKind,
                        })
                      }
                    >
                      {kinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {kindLabel[kind]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            />
            <PagedRows
              title="Institution units"
              collection="units"
              page={collectionPages.units}
              setPage={(page) => setCollectionPage("units", page)}
              rows={profile.units}
              limit={200}
              initiallyOpen
              add={() =>
                setProfile({
                  ...profile,
                  units: [
                    ...profile.units,
                    { code: "", name: "", typeCode: "" },
                  ],
                })
              }
              remove={(index) => removeRow("units", index)}
              render={(row, index) => (
                <>
                  <Field
                    label={`Unit code ${index + 1}`}
                    {...validationField("units", "code", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.code}
                      onChange={(event) =>
                        editRow("units", index, { code: event.target.value })
                      }
                      required
                      maxLength={45}
                    />
                  </Field>
                  <Field
                    label={`Unit name ${index + 1}`}
                    {...validationField("units", "name", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.name}
                      onChange={(event) =>
                        editRow("units", index, { name: event.target.value })
                      }
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    label={`Unit type ${index + 1}`}
                    {...validationField("units", "typeCode", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.typeCode}
                      onChange={(event) =>
                        editRow("units", index, {
                          typeCode: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Choose a type</option>
                      {options(profile.unitTypes)}
                    </select>
                  </Field>
                </>
              )}
            />
            <PagedRows
              title="Relationships"
              collection="relationships"
              page={collectionPages.relationships}
              setPage={(page) => setCollectionPage("relationships", page)}
              rows={profile.relationships}
              limit={400}
              add={() =>
                setProfile({
                  ...profile,
                  relationships: [
                    ...profile.relationships,
                    { fromCode: "", toCode: "", type: "REPORTS_TO" },
                  ],
                })
              }
              remove={(index) => removeRow("relationships", index)}
              render={(row, index) => (
                <>
                  <Field
                    label={`From unit ${index + 1}`}
                    {...validationField("relationships", "fromCode", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.fromCode}
                      onChange={(event) =>
                        editRow("relationships", index, {
                          fromCode: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Choose a unit</option>
                      {options(profile.units)}
                    </select>
                  </Field>
                  <Field
                    label={`Relationship ${index + 1}`}
                    {...validationField("relationships", "type", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.type}
                      onChange={(event) =>
                        editRow("relationships", index, {
                          type: event.target.value as DemoUnitRelationship,
                        })
                      }
                    >
                      {relationships.map((type) => (
                        <option key={type} value={type}>
                          {relationshipLabel[type]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={`To unit ${index + 1}`}
                    {...validationField("relationships", "toCode", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.toCode}
                      onChange={(event) =>
                        editRow("relationships", index, {
                          toCode: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Choose a unit</option>
                      {options(profile.units)}
                    </select>
                  </Field>
                </>
              )}
            />
            <PagedRows
              title="Period types"
              collection="periodTypes"
              page={collectionPages.periodTypes}
              setPage={(page) => setCollectionPage("periodTypes", page)}
              rows={profile.periodTypes}
              limit={30}
              add={() =>
                setProfile({
                  ...profile,
                  periodTypes: [
                    ...profile.periodTypes,
                    { code: "", label: "" },
                  ],
                })
              }
              remove={(index) => removeRow("periodTypes", index)}
              render={(row, index) => (
                <>
                  <Field
                    label={`Period type code ${index + 1}`}
                    {...validationField("periodTypes", "code", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.code}
                      onChange={(event) =>
                        editRow("periodTypes", index, {
                          code: event.target.value,
                        })
                      }
                      required
                      maxLength={40}
                    />
                  </Field>
                  <Field
                    label={`Period type label ${index + 1}`}
                    {...validationField("periodTypes", "label", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.label}
                      onChange={(event) =>
                        editRow("periodTypes", index, {
                          label: event.target.value,
                        })
                      }
                      required
                      maxLength={120}
                    />
                  </Field>
                </>
              )}
            />
            <PagedRows
              title="Academic periods"
              collection="periods"
              page={collectionPages.periods}
              setPage={(page) => setCollectionPage("periods", page)}
              rows={profile.periods}
              limit={100}
              add={() =>
                setProfile({
                  ...profile,
                  periods: [
                    ...profile.periods,
                    {
                      code: "",
                      name: "",
                      typeCode: "",
                      parentCode: null,
                      startDate: "",
                      endDate: "",
                    },
                  ],
                })
              }
              remove={(index) => removeRow("periods", index)}
              render={(row, index) => (
                <>
                  <Field
                    label={`Period code ${index + 1}`}
                    {...validationField("periods", "code", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.code}
                      onChange={(event) =>
                        editRow("periods", index, { code: event.target.value })
                      }
                      required
                      maxLength={45}
                    />
                  </Field>
                  <Field
                    label={`Period name ${index + 1}`}
                    {...validationField("periods", "name", index)}
                  >
                    <input
                      className={staffUi.control}
                      value={row.name}
                      onChange={(event) =>
                        editRow("periods", index, { name: event.target.value })
                      }
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    label={`Period type ${index + 1}`}
                    {...validationField("periods", "typeCode", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.typeCode}
                      onChange={(event) =>
                        editRow("periods", index, {
                          typeCode: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Choose a type</option>
                      {options(profile.periodTypes)}
                    </select>
                  </Field>
                  <Field
                    label={`Parent period ${index + 1} (optional)`}
                    {...validationField("periods", "parentCode", index)}
                  >
                    <select
                      className={staffUi.control}
                      value={row.parentCode ?? ""}
                      onChange={(event) =>
                        editRow("periods", index, {
                          parentCode: event.target.value || null,
                        })
                      }
                    >
                      <option value="">No parent</option>
                      {options(
                        profile.periods.filter(
                          (period) => period.code !== row.code,
                        ),
                      )}
                    </select>
                  </Field>
                  <Field
                    label={`Start date ${index + 1}`}
                    {...validationField("periods", "startDate", index)}
                  >
                    <input
                      className={staffUi.control}
                      type="date"
                      value={row.startDate}
                      onChange={(event) =>
                        editRow("periods", index, {
                          startDate: event.target.value,
                        })
                      }
                      required
                    />
                  </Field>
                  <Field
                    label={`End date ${index + 1}`}
                    {...validationField("periods", "endDate", index)}
                  >
                    <input
                      className={staffUi.control}
                      type="date"
                      value={row.endDate}
                      onChange={(event) =>
                        editRow("periods", index, {
                          endDate: event.target.value,
                        })
                      }
                      required
                    />
                  </Field>
                </>
              )}
            />
            <div className={styles.fields}>
              <Field
                label="Reason for this version"
                {...validationField("command", "reason")}
              >
                <textarea
                  className={staffUi.control}
                  value={reason}
                  onChange={(event) => {
                    clearValidation();
                    setReason(event.target.value);
                  }}
                  required
                  maxLength={500}
                />
              </Field>
            </div>
          </fieldset>
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primary}
              disabled={pending !== null || activationUncertain}
            >
              {pending === "save"
                ? "Saving draft…"
                : saveUncertain
                  ? "Retry saved draft"
                  : "Save new draft"}
            </button>
          </div>
          {saveReference && saveUncertain && (
            <p className={styles.meta}>Request reference: {saveReference}</p>
          )}
        </form>
      )}

      <section className={styles.panel} aria-labelledby="next-handoffs">
        <h2 className={staffUi.sectionHeading} id="next-handoffs">
          Owner handoffs
        </h2>
        <p className={styles.supporting}>
          These workflows remain separate from installing the structure and
          calendar.
        </p>
        <ul className={styles.handoffs}>
          {report.handoffs.map((handoff) => (
            <li key={handoff.label}>
              <strong>{handoff.label} · not yet activated</strong>
              <span>{handoff.reason}</span>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          Source inventory: {report.impact.deliveryOfferings} delivery offerings
          · {report.impact.buildings} buildings · {report.impact.timetableRules}{" "}
          timetable rules · {report.impact.masterPreviews} master previews.
        </p>
      </section>
      <section className={styles.panel} aria-labelledby="setup-history">
        <h2 className={staffUi.sectionHeading} id="setup-history">
          Version history
        </h2>
        <p className={styles.supporting}>
          {report.versions.length} saved versions on history page{" "}
          {historyBatch + 1}. Use older and newer versions to inspect retained
          history.
        </p>
        <ol className={styles.history}>
          {report.versions
            .slice(historyPage * 10, historyPage * 10 + 10)
            .map((row: DemoUniversityVersion) => (
              <li key={row.id}>
                <strong>
                  Version {row.version} ·{" "}
                  {row.activation?.id === report.activeActivationId
                    ? "Active"
                    : row.activation
                      ? "Previously active"
                      : "Draft"}
                </strong>
                <span className={styles.meta}>
                  {row.createdByName} · {formatLusaka(row.createdAt)}
                </span>
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={pending !== null || activationUncertain}
                  onClick={() => selectVersion(row.id)}
                >
                  Review version {row.version}
                </button>
              </li>
            ))}
        </ol>
        {report.versions.length > 10 && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={historyPage === 0}
              onClick={() => setHistoryPage(historyPage - 1)}
            >
              Previous versions
            </button>
            <span className={styles.meta}>
              Page {historyPage + 1} of {Math.ceil(report.versions.length / 10)}
            </span>
            <button
              type="button"
              className={styles.secondary}
              disabled={(historyPage + 1) * 10 >= report.versions.length}
              onClick={() => setHistoryPage(historyPage + 1)}
            >
              Next versions
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
