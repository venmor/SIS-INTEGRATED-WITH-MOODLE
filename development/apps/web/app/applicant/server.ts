import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Read only: the API checks active role, ownership and state for every request. */
export async function loadApplicant<T>(
  path: string,
  returnTo: string,
): Promise<{ data: T | null; status: number; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  let response: Response;
  try {
    response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/applications${path}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    return {
      data: null,
      status: 503,
      message:
        "We cannot reach the application service. Your saved application is kept. Try again shortly.",
    };
  }
  if (response.status === 401)
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  const data = await response.json().catch(() => ({}));
  return response.ok
    ? { data: data as T, status: response.status, message: "" }
    : {
        data: null,
        status: response.status,
        message:
          data.message ??
          "This application is unavailable in your current workspace. Return to your applications or switch to your applicant workspace.",
      };
}
