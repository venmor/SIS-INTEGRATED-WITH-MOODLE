import { cookies } from "next/headers";
import Link from "next/link";
import type { GradeMappingView } from "@sis/contracts";
import { Notice, StatusChip } from "@sis/ui";
import styles from "../../../../page.module.css";

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

interface TestResult {
  result?: string;
  reasons?: string[];
  conditions?: Array<{ condition: string; passed: boolean }>;
  testedAt?: string;
}

// Mapping detail: both identifiers, version and the 6-condition
// synthetic test result. Activation happens only on the dedicated
// decide page, never inline.
export default async function GradeMappingDetailPage({
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
          <h1 className={styles.title}>Grade mapping</h1>
          <Notice
            severity="warning"
            title={!list.ok && (list.status === 401 || list.status === 403) ? "Restricted area" : "Mapping unavailable"}
            message="This mapping needs assessment authority, or it does not exist in your scope."
            action={{ label: "Grade mappings", href: "/admin/assessment/mappings" }}
          />
        </main>
      </div>
    );
  const test = (item.testResult ?? null) as TestResult | null;
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Grade mapping · {item.status} v{item.version}
        </h1>
        <p>
          <Link href="/admin/assessment/mappings">Grade mappings</Link> ·{" "}
          <Link href={`/admin/assessment/mappings/${item.id}/decide`}>
            Decide activation
          </Link>
        </p>
        <Notice
          severity="info"
          title="Frozen evidence package"
          message={`Version v${item.version} · status ${item.status}. The activator signs exactly this version; a later change invalidates the decision.`}
        />
        <dl>
          <dt>Component ID</dt>
          <dd>{item.componentId}</dd>
          <dt>Moodle activity ID</dt>
          <dd>{item.moodleActivityId}</dd>
          <dt>Moodle course reference</dt>
          <dd>{item.moodleCourseRef}</dd>
          <dt>Status</dt>
          <dd>
            <StatusChip tone={item.status === "ACTIVE" ? "success" : "attention"}>
              {item.status}
            </StatusChip>
          </dd>
          <dt>Version</dt>
          <dd>v{item.version}</dd>
        </dl>
        <h2>Synthetic test result</h2>
        {!test || !test.result ? (
          <p>No passing test recorded. Run a synthetic test before activation.</p>
        ) : (
          <>
            <p>
              Result <strong>{test.result}</strong>
              {test.testedAt ? ` · tested ${test.testedAt}` : ""}
            </p>
            {(test.conditions ?? []).length > 0 ? (
              <ul>
                {(test.conditions ?? []).map((c) => (
                  <li key={c.condition}>
                    {c.condition}: {c.passed ? "pass" : "fail"}
                  </li>
                ))}
              </ul>
            ) : null}
            {(test.reasons ?? []).length > 0 ? (
              <ul>
                {(test.reasons ?? []).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
            <pre>{JSON.stringify(test, null, 2)}</pre>
          </>
        )}
      </main>
    </div>
  );
}
