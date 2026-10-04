import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loadResult<T>(
  path: string,
  returnTo: string,
): Promise<{ data: T | null; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/assessment${path}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401)
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    if (!response.ok)
      return {
        data: null,
        message:
          "This result record is unavailable in your current workspace. Return to your permitted tasks or contact the examinations office.",
      };
    return { data: (await response.json()) as T, message: "" };
  } catch (error) {
    // Next redirects must leave the loader instead of becoming an outage.
    if (error && typeof error === "object" && "digest" in error) throw error;
    return {
      data: null,
      message:
        "The result service is temporarily unavailable. Existing official results are preserved. Please check again later.",
    };
  }
}
