import { cookies } from "next/headers";
import Link from "next/link";
import type { ConnectionView, MappingView } from "@sis/contracts";
import { Notice } from "@sis/ui";
import { MappingForms } from "./forms";
import { ConnectionValidate } from "./validate";
import { moodleBackendLabel } from "../../integration/backend-label";
import styles from "../../../page.module.css";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/integration${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

// Moodle mapping registry: both identifiers, versions, four-eyes
// activation. Health reports state, never secret values.
export default async function MappingsPage() {
  const [health, list] = await Promise.all([
    loadStaff<ConnectionView>("/health"),
    loadStaff<{ items: MappingView[] }>("/mappings"),
  ]);
  if (!health.ok || !list.ok)
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Moodle mappings</h1>
          <Notice
            severity="warning"
            title="Workspace unavailable"
            message="This workspace needs Moodle administration authority. Sign in with a Moodle role or ask an administrator."
            action={{ label: "Back home", href: "/" }}
          />
        </main>
      </div>
    );
  const backendLabel = moodleBackendLabel(health.data.backend);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>Moodle mappings</h1>
        <p className={styles.lede}>
          Map SIS identifiers to Moodle destinations with versioned,
          four-eyes activation.
        </p>
        <p>
          <Link href="/admin/moodle">Moodle administration</Link>
        </p>

        <section className={styles.section} aria-label="Mapping authority">
          <h2>Mapping authority</h2>
          <Notice
            severity={health.data.status === "HEALTHY" ? "success" : "warning"}
            title={`Connection ${health.data.status}`}
            message={`${backendLabel}${health.data.version ? ` · version ${health.data.version}` : ""}. Health reports state only; credential values are never shown here.`}
          />
          <ConnectionValidate />
          <p>
            SIS identifiers remain the source side of each mapping. Activation
            changes how governed sync resolves a Moodle destination; it does
            not rewrite the originating SIS record.
          </p>
        </section>

        <section className={styles.section} aria-label="Mapping registry">
          <h2>Registry</h2>
          {list.data.items.length === 0 ? (
            <p>No mappings yet.</p>
          ) : (
            <ul>
              {list.data.items.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.kind} · {item.status} · v{item.version}
                  </strong>{" "}
                  — {item.sisType} {item.sisId} ↔ {item.moodleId}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-label="Mapping actions">
          <h2>Mapping actions</h2>
          <MappingForms />
        </section>
      </main>
    </div>
  );
}
