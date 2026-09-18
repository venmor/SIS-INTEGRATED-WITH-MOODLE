import styles from "../../page.module.css";
import Link from "next/link";
import { Empty } from "@sis/ui";
import { Notice } from "@sis/ui";
import { Status } from "@sis/ui";
import { formatLusaka } from "../../../lib/time";
import type { ProgrammeOfferingDetail } from "@sis/contracts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Programme details",
  description:
    "Entry requirements, application checklist, deadlines and next steps for one programme offering.",
};

function availabilityState(
  availability: string,
): "success" | "attention" | "error" | "neutral" {
  if (availability === "OPEN") return "success";
  if (availability === "SOON") return "attention";
  if (availability === "RETIRED") return "error";
  return "neutral";
}

function availabilityText(status: string): string {
  if (status === "OPEN") return "Open for applications";
  if (status === "SOON") return "Opens soon";
  if (status === "RETIRED") return "No longer offered";
  return "Not currently open";
}

function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lusaka",
  });
}

async function loadOffering(id: string): Promise<{
  status: number;
  detail: ProgrammeOfferingDetail | null;
}> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/catalogue/offerings/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return { status: res.status, detail: null };
    return { status: 200, detail: (await res.json()) as ProgrammeOfferingDetail };
  } catch {
    return { status: 0, detail: null };
  }
}

export default async function OfferingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { status, detail } = await loadOffering(id);
  if (status === 0) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Programme details</h1>
          <Notice
            severity="error"
            title="Catalogue temporarily unavailable"
            message="Programme details cannot be shown right now. Try again or contact Admissions."
          />
        </main>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Programme details</h1>
          <Empty
            caseVariant="nothing"
            title="Programme not found"
            message="This programme page does not exist or is no longer published."
            action={{ label: "Find a programme", href: "/discover" }}
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>
          Admissions · Public catalogue · {detail.programmeCode ?? "Programme"}
        </p>
        <h1 className={styles.title}>{detail.programmeName}</h1>
        <p className={styles.lede}>
          {detail.awardLevel} · {detail.school} · {detail.duration}
        </p>
        <Status
          severity={availabilityState(detail.availability)}
          state={availabilityText(detail.availability)}
          reason={
            detail.deadline
              ? `Applications open until ${formatLusaka(detail.deadline)}.`
              : undefined
          }
          updated={`Requirements version ${detail.publishedVersion}, effective ${dateOnly(detail.effectiveDate)}`}
          owner={detail.owningOffice}
        />
        {detail.statusNote ? (
          <p className={styles.supporting}>{detail.statusNote}</p>
        ) : null}
        <h2>What the programme covers</h2>
        <p className={styles.supporting}>{detail.overview}</p>
        <h2>Entry requirements</h2>
        <ul>
          {detail.entryRequirements.map((rule) => (
            <li key={rule.id}>
              <strong>{rule.label}</strong> —{" "}
              {rule.mandatory ? "Mandatory" : "If applicable"} · Evidence:{" "}
              {rule.evidence}
              {rule.kind === "GRADE" && rule.minGrade !== null
                ? ` · Minimum grade ${rule.minGrade} (lower is better)`
                : null}
              {rule.requiresVerification
                ? " · Formal verification required before a final decision"
                : null}
            </li>
          ))}
        </ul>
        <h2>Application checklist</h2>
        <ul>
          {detail.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={styles.supporting}>
          Fee information: {detail.feeScheduleRef}. The approved fee schedule
          applies at application.
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href={`/discover/${id}/eligibility`}>
            Check my eligibility
          </a>
        </div>
        <p className={styles.supporting}>
          {detail.canStart ? (
            <>
              Applications are open.{" "}
              <Link href="/sign-in">Start application</Link> (account required;
              the application form arrives in the next slice).
            </>
          ) : (
            <>Applications cannot be started for this offering right now.</>
          )}{" "}
          <Link href={`/discover/compare?ids=${id}`}>Compare</Link>
        </p>
        <p className={styles.supporting}>
          Last updated: {formatLusaka(detail.lastUpdated)}.
        </p>
      </main>
    </div>
  );
}
