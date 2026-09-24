import { cookies } from "next/headers";

export type FinanceWorkspaceRole =
  | "FINANCE_OFFICER"
  | "FINANCE_APPROVER";

export async function loadFinanceWorkspaceRole(): Promise<FinanceWorkspaceRole | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;

  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const response = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const me = (await response.json()) as {
      activeWorkspace?: { role?: string } | null;
    };
    const role = me.activeWorkspace?.role;
    return role === "FINANCE_OFFICER" || role === "FINANCE_APPROVER"
      ? role
      : null;
  } catch {
    return null;
  }
}
