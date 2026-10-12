import "server-only";
import { cookies } from "next/headers";

export async function timetablePermissions(
  active: { role: string; scopeType: string; scopeRef: string } | null,
) {
  if (
    !active ||
    !["DOMAIN_ADMIN", "TIMETABLE_COORDINATOR"].includes(active.role) ||
    active.scopeType !== "SYSTEM" ||
    active.scopeRef !== "DEMO-UNIVERSITY" ||
    process.env.DEMO_MODE !== "true" ||
    process.env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS !== "true"
  )
    return null;
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/timetabling/demo-master/permissions`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as {
      canRead: boolean;
      canCreate: boolean;
      canPublish: boolean;
    };
  } catch {
    return null;
  }
}
