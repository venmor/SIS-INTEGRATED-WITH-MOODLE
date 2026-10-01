import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Read only: the API checks active role, ownership and state for every request. */
export async function loadApplicant<T>(
  path: string,
  returnTo: string,
): Promise<{ data: T | null; status: number; message: string }> {
  const sid = (await cookies()).get("sid")?.value;
  console.log('[DEBUG loadApplicant] path:', path, 'sid:', sid ? 'present' : 'missing');
  if (!sid) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  let response: Response;
  try {
    const apiUrl = `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/applications${path}`;
    console.log('[DEBUG loadApplicant] calling:', apiUrl);
    response = await fetch(
      apiUrl,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    console.log('[DEBUG loadApplicant] response status:', response.status);
  } catch (err) {
    console.error('[DEBUG loadApplicant] fetch error:', err);
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
  console.log('[DEBUG loadApplicant] response ok:', response.ok, 'data:', JSON.stringify(data).slice(0, 200));
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
