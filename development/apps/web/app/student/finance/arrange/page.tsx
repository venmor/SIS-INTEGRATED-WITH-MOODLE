import type { ArrangementView } from "@sis/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, DataTable, Notice, StatusChip } from "@sis/ui";
import { formatLusaka } from "../../../../lib/time";
import { ArrangementForm } from "./forms";
import styles from "../../../applicant/applicant.module.css";

async function loadArrangements(
  sid: string,
): Promise<{ items: ArrangementView[]; message?: string } | null> {
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
    if (!response.ok)
      return {
        items: [],
        message: "Your arrangement history is unavailable. Try again shortly.",
      };
    return (await response.json()) as { items: ArrangementView[] };
  } catch {
    return {
      items: [],
      message: "We cannot reach your arrangement history. Try again shortly.",
    };
  }
}

// Payment arrangement request page: eligibility, terms, effect, decision
// authority. Approval grants a time-boxed entitlement; declines change
// nothing and keep the original obligation.
export default async function ArrangePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = (await searchParams).period;
  if (!period || !/^[A-Za-z0-9_-]{1,16}$/.test(period))
    redirect("/student/finance");
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");
  const [list, accountResponse] = await Promise.all([
    loadArrangements(sid),
    fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/finance/account?period=${encodeURIComponent(period)}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    ).catch(() => null),
  ]);
  if (!list) redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");
  if (accountResponse?.status === 401)
    redirect("/sign-in?returnTo=%2Fstudent%2Ffinance%2Farrange");
  if (!accountResponse?.ok)
    return (
      <p role="alert">
        This invoice period is unavailable in your account.{" "}
        <Link href="/student/finance">Choose an invoiced period</Link>.
      </p>
    );
  return (
    <>
      <p className={styles.eyebrow}>Payment arrangement</p>
      <h1>Request payment arrangement · {period}</h1>
      <p className={styles.muted}>
        An approved arrangement lets you register under its terms; it is decided
        by Student Finance, not by submitting this form. If your request is
        declined, your original obligation stays active.
      </p>
      <ArrangementForm period={period} />
      <Card>
        {list.message ? (
          <Notice
            severity="warning"
            title="Arrangement history unavailable"
            message={list.message}
          />
        ) : (
          <DataTable
            title="Your arrangement requests across periods"
            description="Submitted terms and decisions. Approval is required before an arrangement affects clearance."
            rows={list.items}
            keyOf={(item) => item.id}
            emptyText="No arrangement requests."
            columns={[
              { heading: "Proposed terms", render: (item) => item.terms },
              {
                heading: "Status",
                render: (item) => (
                  <StatusChip tone="neutral">{item.status}</StatusChip>
                ),
              },
              {
                heading: "Expires",
                render: (item) =>
                  item.expiresAt
                    ? formatLusaka(item.expiresAt)
                    : "No expiry recorded",
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}
