"use client";

import { useState } from "react";
import Link from "next/link";
import type { AssessmentPlanView, GradeBatchView } from "@sis/contracts";
import { DataTable, StatusChip } from "@sis/ui";
import { NavigationIcon } from "../../navigation-icon";
import styles from "./workspace.module.css";

type RegistryProps =
  | { kind: "plans"; items: AssessmentPlanView[] }
  | { kind: "batches"; items: GradeBatchView[] };
function stateTone(state: string) {
  return state === "APPROVED" || state === "VALIDATED"
    ? ("success" as const)
    : state === "DRAFT" || state === "RECEIVED"
      ? ("attention" as const)
      : ("neutral" as const);
}
export function AssessmentRegistry(props: RegistryProps) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const isPlan = props.kind === "plans";
  const name = isPlan ? "plans" : "batches";
  const states = [...new Set(props.items.map((item) => item.status))].sort();
  // These are bounded API rows; exact offering/period roles are scoped server-side. The label
  // deliberately does not promise search over unreturned institutional history.
  const query = search.trim().toLowerCase();
  const plans =
    props.kind === "plans"
      ? props.items.filter(
          (item) =>
            (!state || item.status === state) &&
            `${item.offeringRef} ${item.periodCode} ${item.status} v${item.version}`
              .toLowerCase()
              .includes(query),
        )
      : [];
  const batches =
    props.kind === "batches"
      ? props.items.filter(
          (item) =>
            (!state || item.status === state) &&
            `${item.sourceRevision} ${item.status}`
              .toLowerCase()
              .includes(query),
        )
      : [];
  const visible = isPlan ? plans.length : batches.length;
  return (
    <section className={styles.panel} aria-labelledby={`${name}-heading`}>
      <div className={`${styles.panelHeading} ${styles.registryHeading}`}>
        <span className={styles.sectionIcon} aria-hidden="true">
          <NavigationIcon href={`/admin/assessment/${name}`} />
        </span>
        <div>
          <h2 id={`${name}-heading`}>{isPlan ? "Plans" : "Batches"}</h2>
          <p>
            {isPlan
              ? "Versioned assessment schemes with components, weights and approval state."
              : "Immutable staging snapshots with quarantine flags."}
          </p>
        </div>
        <div className={styles.filters}>
          <label className={styles.visuallyHidden} htmlFor={`${name}-search`}>
            Search loaded {name}
          </label>
          <input
            id={`${name}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${name}…`}
          />
          <details>
            <summary>Filter</summary>
            <div className={styles.filterPanel}>
              <label htmlFor={`${name}-state`}>
                {isPlan ? "Plan state" : "Batch state"}
              </label>
              <select
                id={`${name}-state`}
                value={state}
                onChange={(event) => setState(event.target.value)}
              >
                <option value="">All states</option>
                {[
                  ...new Set([
                    ...states,
                    ...(isPlan
                      ? ["DRAFT", "APPROVED", "SUPERSEDED"]
                      : ["RECEIVED", "VALIDATED"]),
                  ]),
                ]
                  .sort()
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
          </details>
        </div>
      </div>
      {props.items.length ? (
        <p className={styles.count} role="status">
          {visible} of {props.items.length} loaded {name} · Latest authorised
          records, up to 200
        </p>
      ) : null}
      {!visible ? (
        <div className={styles.empty} role="status">
          <NavigationIcon href="/documents" />
          <strong>
            {props.items.length
              ? `No ${name} match these filters.`
              : isPlan
                ? "No assessment plans yet."
                : "No grade batches yet."}
          </strong>
          <p>
            {props.items.length
              ? "Change the search or state filter to view your loaded records."
              : isPlan
                ? "Create a draft plan above to get started. Plans will appear here with their versions and approval state."
                : "Stage a grade batch using the form above. Created batches will appear here with their status."}
          </p>
        </div>
      ) : isPlan ? (
        <DataTable
          hideTitle
          title="Assessment plans"
          description="Loaded plans in your current workspace"
          columns={[
            {
              heading: "Offering",
              render: (item: AssessmentPlanView) => item.offeringRef,
            },
            {
              heading: "Period",
              render: (item: AssessmentPlanView) => item.periodCode,
            },
            {
              heading: "Version",
              numeric: true,
              render: (item: AssessmentPlanView) => `v${item.version}`,
            },
            {
              heading: "State",
              render: (item: AssessmentPlanView) => (
                <StatusChip tone={stateTone(item.status)}>
                  {item.status}
                </StatusChip>
              ),
            },
            {
              heading: "Actions",
              render: (item: AssessmentPlanView) => (
                <>
                  <Link href={`/admin/assessment/plans/${item.id}`}>
                    Open plan
                  </Link>
                  {" · "}
                  <Link href={`/admin/assessment/plans/${item.id}/decide`}>
                    Decide
                  </Link>
                  <details className={styles.references}>
                    <summary>Details</summary>
                    <span>Policy: {item.policyVersion}</span>
                    <code>{item.id}</code>
                  </details>
                </>
              ),
            },
          ]}
          rows={plans}
          keyOf={(item) => item.id}
          emptyText="No assessment plans yet."
        />
      ) : (
        <DataTable
          hideTitle
          title="Grade batches"
          description="Loaded batches in your current workspace"
          columns={[
            {
              heading: "Revision",
              render: (item: GradeBatchView) => item.sourceRevision,
            },
            {
              heading: "State",
              render: (item: GradeBatchView) => (
                <StatusChip tone={stateTone(item.status)}>
                  {item.status}
                </StatusChip>
              ),
            },
            {
              heading: "Lines",
              numeric: true,
              render: (item: GradeBatchView) => item.lines.length,
            },
            {
              heading: "Quarantined",
              numeric: true,
              render: (item: GradeBatchView) =>
                item.lines.filter((line) => line.status !== "STAGED").length,
            },
            {
              heading: "Actions",
              render: (item: GradeBatchView) => (
                <>
                  <Link href={`/admin/assessment/batches/${item.id}`}>
                    Open batch
                  </Link>
                  <details className={styles.references}>
                    <summary>Details</summary>
                    <code>{item.id}</code>
                  </details>
                </>
              ),
            },
          ]}
          rows={batches}
          keyOf={(item) => item.id}
          emptyText="No grade batches yet."
        />
      )}
    </section>
  );
}
