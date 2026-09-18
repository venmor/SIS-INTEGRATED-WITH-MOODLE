import styles from "../../../page.module.css";
import { Empty } from "@sis/ui";
import { Notice } from "@sis/ui";
import type {
  ProgrammeOfferingDetail,
} from "@sis/contracts";
import { EligibilityForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check my eligibility",
  description:
    "Compare your qualifications with published requirements. Guidance only — never an admission decision.",
};

async function loadOffering(id: string): Promise<ProgrammeOfferingDetail | null> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/catalogue/offerings/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ProgrammeOfferingDetail;
  } catch {
    return null;
  }
}

async function loadRoutes(): Promise<Array<{ code: string; label: string }>> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/catalogue/routes`, { cache: "no-store" });
    if (!res.ok) return [];
    return (
      (await res.json()) as {
        routes: Array<{ code: string; label: string }>;
      }
    ).routes;
  } catch {
    return [];
  }
}

export default async function EligibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, routes] = await Promise.all([loadOffering(id), loadRoutes()]);
  if (!detail) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Check my eligibility</h1>
          <Empty
            caseVariant="nothing"
            title="Programme not found"
            message="This eligibility check is unavailable because the programme page does not exist."
            action={{ label: "Find a programme", href: "/discover" }}
          />
        </main>
      </div>
    );
  }
  if (routes.length === 0) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Check my eligibility</h1>
          <Notice
            severity="error"
            title="Catalogue temporarily unavailable"
            message="Eligibility guidance cannot run right now. Try again or contact Admissions."
          />
        </main>
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Admissions · Public catalogue</p>
        <h1 className={styles.title}>Check my eligibility</h1>
        <p className={styles.lede}>
          {detail.programmeName} · {detail.intake ?? detail.availability}. Your
          answers stay in this session unless you save them after creating an
          account.
        </p>
        <EligibilityForm
          offeringId={id}
          programmeName={detail.programmeName}
          intake={detail.intake}
          canStart={detail.canStart}
          closedNote={detail.statusNote}
          routes={routes}
          rules={detail.entryRequirements}
        />
      </main>
    </div>
  );
}
