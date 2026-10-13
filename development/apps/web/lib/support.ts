import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loadSupport<T>(
  path: string,
  returnTo: string,
): Promise<{
  data: T | null;
  status: number;
  message: string;
}> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/support/${path}`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.status === 401)
      redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    const body = (await response.json().catch(() => ({}))) as T & {
      message?: string;
    };
    return response.ok
      ? { data: body, status: response.status, message: "" }
      : {
          data: null,
          status: response.status,
          message:
            body.message ??
            "Support information is unavailable in this workspace.",
        };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return {
      data: null,
      status: 503,
      message:
        "We cannot reach the support service. No request was changed. Try again shortly.",
    };
  }
}

export interface AcademicSupportReadiness {
  available: boolean;
  reason: string | null;
  receiver: { name: string; service: string } | null;
  programmeName: string | null;
  campus: string | null;
  noticeVersion: string | null;
}

export interface AcademicSupportSummary {
  id: string;
  reference: string;
  category: string;
  status: string;
  createdAt: string;
  service: string;
  owner: string;
}

export interface AcademicSupportCase {
  id: string;
  reference: string;
  category: string;
  contactMethod: string;
  details: string | null;
  status: string;
  createdAt: string;
  service: string;
  owner: string;
  student: { number: string; name: string };
  messages: Array<{
    id: string;
    authorRole: string;
    body: string;
    createdAt: string;
  }>;
  actions: AcademicSupportAction[];
  closure: { id: string; reason: string; closedAt: string } | null;
}

export interface AcademicSupportAction {
  id: string;
  title: string;
  explanation: string;
  dueOn: string;
  routeKey: string;
  href: string | null;
  status: string;
  createdAt: string;
}

export function supportCategory(category: string) {
  if (category === "ACADEMIC_ADVISING") return "Academic advising";
  if (category === "COURSE_DIFFICULTY")
    return "Course or assessment difficulty";
  return "Academic support";
}

export function supportStatus(status: string) {
  if (status === "CLOSED") return "Follow-up complete";
  if (status === "RECEIVED") return "Received by your adviser";
  if (status === "ADVISER_REPLIED") return "Your adviser replied";
  if (status === "STUDENT_REPLIED") return "Your reply was sent";
  return "Status unavailable";
}

export function supportClosureReason(reason: string) {
  if (reason === "GUIDANCE_GIVEN") return "Academic guidance provided";
  if (reason === "COURSE_PLAN_RESOLVED") return "Course-plan issue resolved";
  if (reason === "AGREED_ACTION_COMPLETED") return "Agreed action completed";
  return "Academic follow-up completed";
}
