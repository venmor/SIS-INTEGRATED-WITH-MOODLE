import "server-only";
import { cookies } from "next/headers";

/** Reuse the source owner's guarded, bounded report; a role name grants no link. */
export async function institutionSetupAvailable(
  active: { role: string; scopeType: string; scopeRef: string } | null,
) {
  if (
    !active ||
    active.role !== "DOMAIN_ADMIN" ||
    active.scopeType !== "SYSTEM" ||
    active.scopeRef !== "DEMO-UNIVERSITY" ||
    process.env.DEMO_MODE !== "true" ||
    process.env.SIS_ENABLE_INSTITUTION_DEMO_SETUP !== "true"
  )
    return false;
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return false;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/institution-setup/demo-university`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return false;
    const report = (await response.json()) as {
      canPropose?: boolean;
      canApprove?: boolean;
    };
    return report.canPropose === true || report.canApprove === true;
  } catch {
    return false;
  }
}
