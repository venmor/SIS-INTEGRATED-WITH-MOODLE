import { cookies } from "next/headers";
import type {
  ReviewEvidenceView,
  ReviewFindingView,
  ReviewTimelineEvent,
} from "@sis/contracts";
import { Notice } from "@sis/ui";
import styles from "../../../../page.module.css";
import { ReviewCase } from "./case";

export const dynamic = "force-dynamic";

async function loadStaff<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { ok: false, status: 401 };
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/review${path}`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
  }
}

export default async function ReviewCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [evidence, findings, history] = await Promise.all([
    loadStaff<ReviewEvidenceView>(`/${id}/evidence`),
    loadStaff<{ items: ReviewFindingView[] }>(`/${id}/findings`),
    loadStaff<{ items: ReviewTimelineEvent[] }>(`/${id}/history`),
  ]);
  if (!evidence.ok || !findings.ok || !history.ok) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Student Information System</p>
          <h1 className={styles.title}>Review case</h1>
          <Notice
            severity="warning"
            title="Case unavailable"
            message="This case needs a reviewer workspace with an active claim. Claim it from the queue, or ask an administrator."
            action={{ label: "Back to queue", href: "/admin/admissions/queue" }}
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Student Information System</p>
        <h1 className={styles.title}>
          Review case {evidence.data.reference}
        </h1>
        <p className={styles.lede}>
          Assess application evidence, record findings, and submit formal recommendations.
        </p>
        <ReviewCase
          evidence={evidence.data}
          initialFindings={findings.data.items}
          initialHistory={history.data.items}
        />
      </main>
    </div>
  );
}
