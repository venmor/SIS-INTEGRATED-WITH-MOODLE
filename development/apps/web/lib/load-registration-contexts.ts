import { cookies } from "next/headers";
import {
  isRegistrationContexts,
  type ContextInventory,
} from "./registration-contexts";

export async function loadRegistrationContexts(): Promise<ContextInventory> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid)
    return { data: null, message: "Sign in to check your study periods." };
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration/contexts`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    const data: unknown = await response.json().catch(() => null);
    if (response.ok && isRegistrationContexts(data))
      return { data, message: "" };
  } catch {
    /* Unavailable is unknown, never evidence of no registration. */
  }
  return {
    data: null,
    message:
      "Study periods could not be checked. Your registration is unchanged. Refresh to try again.",
  };
}
