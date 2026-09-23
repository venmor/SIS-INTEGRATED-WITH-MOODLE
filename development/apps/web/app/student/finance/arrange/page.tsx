import type { ArrangementView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrangementForm } from "./forms";
import styles from "../../../applicant/applicant.module.css";

async function loadArrangements(
  sid: string,
): Promise<{ items: ArrangementView[] } | null> {
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/finance/arrangements`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401) return null;
    if (!response.ok) return { items: [] };
    return (await response.json()) as { items: ArrangementView[] };
  } catch {
    return { items: [] };
  }
}

// Payment arrangement request page: eligibility, terms, effect, decision
// authority. Approval grants a time-boxed entitlement; declines change
// nothing and keep the original obligation.
export default async function ArrangePage() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");
  const list = await loadArrangements(sid);
  if (!list)
    redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");
  return (
    <>
      <p className={styles.eyebrow}>Payment arrangement</p>
      <h1>Request payment arrangement</h1>
      <p className={styles.muted}>
        An approved arrangement lets you register under its terms; it is
        decided by Student Finance, not by submitting this form. If your
        request is declined, your original obligation stays active.
      </p>
      <ArrangementForm />
      <h2>Your requests</h2>
      {list.items.length === 0 ? (
        <p className={styles.muted}>No arrangement requests.</p>
      ) : (
        <ul>
          {list.items.map((item) => (
            <li key={item.id}>
              <strong>{item.terms}</strong> — {item.status}
              {item.expiresAt ? ` · Expires ${item.expiresAt}` : ""}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
