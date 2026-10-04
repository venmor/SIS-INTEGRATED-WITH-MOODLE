import { cookies } from "next/headers";
import { Notice } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import pageStyles from "../../../page.module.css";
import styles from "./readiness.module.css";

export const dynamic = "force-dynamic";

interface ReadinessSection {
  id: string;
  label: string;
  status: "BLOCKED" | "MISSING" | "PRESENT_UNVERIFIED";
  reason: string;
  nextAction: string;
  gapIds: string[];
  counts?: Record<string, number>;
}

interface ReadinessReport {
  overall: "BLOCKED";
  sampledAt: string;
  sections: ReadinessSection[];
}

async function loadReport(): Promise<
  { ok: true; report: ReadinessReport } | { ok: false; status: number }
> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const response = await fetch(`${api}/institution-setup/readiness`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, report: (await response.json()) as ReadinessReport };
  } catch {
    return { ok: false, status: 503 };
  }
}

function statusLabel(status: ReadinessSection["status"]) {
  if (status === "PRESENT_UNVERIFIED")
    return "Records found · approval unverified";
  if (status === "MISSING") return "Records missing";
  return "Setup blocked";
}

export default async function SetupReadinessPage() {
  const loaded = await loadReport();
  return (
    <div className={pageStyles.page}>
      <main className={pageStyles.main}>
        <p className={pageStyles.context}>System Operations workspace</p>
        <h1 className={pageStyles.title}>Institution setup readiness</h1>
        {!loaded.ok ? (
          <Notice
            severity="warning"
            title={
              loaded.status === 401 || loaded.status === 403
                ? "Restricted area"
                : "Readiness unavailable"
            }
            message={
              loaded.status === 401 || loaded.status === 403
                ? "This report needs an active global System Administrator workspace. Switch workspace or contact Identity and Access."
                : "We could not check setup records. No readiness decision was made. Try again later."
            }
            action={{ label: "Back home", href: "/" }}
          />
        ) : (
          <>
            <p className={pageStyles.lede}>
              These checks show what the current system can find and which
              institutional decisions still need approval.
            </p>
            <p className={styles.sampled}>
              Checked{" "}
              <time dateTime={loaded.report.sampledAt}>
                {formatLusaka(loaded.report.sampledAt)}
              </time>
              . Counts may change; they do not certify institutional approval.
            </p>
            <Notice
              severity="warning"
              title="Institution setup is blocked"
              message="Found records are provisional until the responsible institution approves their owner, scope, effective dates and change authority."
            />
            <ul className={styles.sections}>
              {loaded.report.sections.map((section) => (
                <li key={section.id} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2>{section.label}</h2>
                    <span className={styles.status}>
                      {statusLabel(section.status)}
                    </span>
                  </div>
                  <p>{section.reason}</p>
                  {section.counts ? (
                    <dl className={styles.counts}>
                      {Object.entries(section.counts).map(([label, count]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{count.toLocaleString("en-ZM")}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <p className={styles.nextAction}>
                    <strong>Next:</strong> {section.nextAction}
                  </p>
                  <p className={styles.gaps}>
                    Design gaps: {section.gapIds.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
