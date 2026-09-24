import { cookies } from "next/headers";

export type FinanceWorkspaceRole =
  | "FINANCE_OFFICER"
  | "FINANCE_APPROVER";

export type FinanceWorkspaceState =
  | { kind: "ok"; role: FinanceWorkspaceRole }
  | { kind: "denied" }
  | { kind: "unavailable" };

export async function loadFinanceWorkspaceState(): Promise<FinanceWorkspaceState> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return { kind: "denied" };

  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const response = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${encodeURIComponent(sid)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) {
      return { kind: "denied" };
    }
    if (!response.ok) return { kind: "unavailable" };

    const me = (await response.json()) as {
      activeWorkspace?: { role?: string } | null;
    };
    const role = me.activeWorkspace?.role;
    if (role === "FINANCE_OFFICER" || role === "FINANCE_APPROVER") {
      return { kind: "ok", role };
    }
    return { kind: "denied" };
  } catch {
    return { kind: "unavailable" };
  }
}
