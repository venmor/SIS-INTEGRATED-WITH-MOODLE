import type { ApplicationError } from "@sis/contracts";

export class ApplicantRequestError extends Error {
  constructor(
    public status: number,
    public detail: Partial<ApplicationError>,
  ) {
    super(
      detail.message ??
        "The application service could not complete this request. Keep this page open and try again.",
    );
  }
}

export async function applicantRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/applications${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined
        ? undefined
        : {
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
          },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApplicantRequestError(response.status, result);
  return result as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApplicantRequestError) {
    return `${error.message}${error.detail.supportReference ? ` Support reference: ${error.detail.supportReference}.` : ""}`;
  }
  return "We could not confirm whether your changes were received. Keep this page open. Check the saved result before trying again.";
}

export function applicationPath(id: string, section?: string) {
  return `/applicant/${encodeURIComponent(id)}${section ? `/${section}` : ""}`;
}
