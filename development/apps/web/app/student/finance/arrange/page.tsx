import type { ArrangementView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@sis/ui";
import { StudentUnavailable } from "../../chrome";
import { ArrangementForm } from "./forms";
import styles from "../../../applicant/applicant.module.css";

type ArrangementState =
  | { kind: "ok"; items: ArrangementView[] }
  | { kind: "unauthorized" }
  | { kind: "failed"; message: string };

async function loadArrangements(sid: string): Promise<ArrangementState> {
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/finance/arrangements`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401) return { kind: "unauthorized" };
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        kind: "failed",
        message:
          payload.message ??
          "Payment arrangements are unavailable right now. Try again shortly.",
      };
    }
    const payload = (await response.json()) as { items: ArrangementView[] };
    return { kind: "ok", items: payload.items };
  } catch {
    return {
      kind: "failed",
      message:
        "We cannot reach Student Finance. Your existing requests are unchanged. Try again shortly.",
    };
  }
}

// Payment arrangement request page: eligibility, terms, effect, decision
// authority. Approval grants a time-boxed entitlement; declines change
// nothing and keep the original obligation.
export default async function ArrangePage() {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");

  const state = await loadArrangements(sid);
  if (state.kind === "unauthorized")
    redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");

  if (state.kind === "failed") {
    return (
      <>
        <PageHeader
          eyebrow="Payment arrangement"
          title="Request payment arrangement"
        />
        <StudentUnavailable message={state.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Payment arrangement"
        title="Request payment arrangement"
        lede="Student Finance decides the request. Approval creates a time-boxed clearance entitlement; a decline leaves the original obligation unchanged."
      />
      <ArrangementForm />
      <h2>Your requests</h2>
      {state.items.length === 0 ? (
        <p className={styles.muted}>No arrangement requests.</p>
      ) : (
        <ul>
          {state.items.map((item) => (
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
