import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeMappingView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { MappingDecideForm } from "./decide";
import styles from "../../../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/assessment${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// UI-DECISION-001 mapping activation: frozen evidence (both identifiers,
// version, 6-condition test result), consequences, authority and the
// exact declaration. Coordinators activate; creators never self-activate.
export default async function MappingDecidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await loadStaff<{ items: GradeMappingView[] }>("/mappings");
  const item = list.ok
    ? list.data.items.find((m) => m.id === id)
    : undefined;
  if (!item)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Mapping activation</h1>
          <Notice
            severity="warning"
            title="Mapping unavailable"
            message="This mapping needs assessment activation authority, or it does not exist in your scope."
            action={{ label: "Grade mappings", href: "/admin/assessment/mappings" }}
          />
        </main>
      </div>
    );
  const test = (item.testResult ?? null) as {
    result?: string;
    reasons?: string[];
    conditions?: Array<{ condition: string; passed: boolean }>;
  } | null;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Mapping activation · {item.status} v{item.version}
        </h1>
        <p>
          <Link href={`/admin/assessment/mappings/${item.id}`}>
            Mapping detail
          </Link>{" "}
          · <Link href="/admin/assessment/mappings">Grade mappings</Link>
        </p>
        <Notice
          severity="info"
          title="Frozen evidence package"
          message={`Version v${item.version} · status ${item.status}. The evidence below is the exact version you sign; only a TESTED mapping with a passing synthetic test can activate.`}
        />
        <h2>Evidence</h2>
        <dl>
          <dt>Component ID</dt>
          <dd>{item.componentId}</dd>
          <dt>Moodle activity ID</dt>
          <dd>{item.moodleActivityId}</dd>
          <dt>Moodle course reference</dt>
          <dd>{item.moodleCourseRef}</dd>
          <dt>Version</dt>
          <dd>v{item.version}</dd>
          <dt>Status</dt>
          <dd>{item.status}</dd>
        </dl>
        <h3>Synthetic test (6 validity conditions)</h3>
        {!test || !test.result ? (
          <p>No test recorded. Activation is refused until a passing test exists.</p>
        ) : (
          <>
            <p>
              Result <strong>{test.result}</strong>
            </p>
            <ul>
              {(test.conditions ?? []).map((c) => (
                <li key={c.condition}>
                  {c.condition}: {c.passed ? "pass" : "fail"}
                </li>
              ))}
            </ul>
            <pre>{JSON.stringify(test, null, 2)}</pre>
          </>
        )}
        {item.status === "TESTED" ? (
          <>
            <h2>Sign the decision</h2>
            <p>
              Authority: programme coordinator with approve-assessment
              (school scope). Moodle administrators wire mappings but never
              activate academic mappings; lecturers capture but never
              activate; the creator cannot self-activate — a second officer
              must decide.
            </p>
            <p>
              Consequence: activation supersedes any earlier active mapping
              for this component; grades may then stage through this binding.
              This cannot be undone by editing.
            </p>
            <p>
              I confirm that I have reviewed the stated evidence and make
              this decision within my assigned authority.
            </p>
            <MappingDecideForm mappingId={item.id} />
          </>
        ) : (
          <Notice
            severity="info"
            title="Decision closed or not ready"
            message={`This mapping is ${item.status}. Only TESTED mappings with a passing test can be activated; decided mappings are never re-activated.`}
          />
        )}
      </main>
    </div>
  );
}
