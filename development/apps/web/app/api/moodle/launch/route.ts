import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";

/**
 * Same-origin launch bridge: a form POST from the student dashboard is
 * exchanged for a single-use launch, then the browser is redirected to the
 * destination. The launch ticket never appears in HTML, so it cannot be
 * replayed by prefetch, history or a copied link.
 */
export async function POST(req: NextRequest) {
  if (!isSameOriginMutation(req)) {
    return NextResponse.json(
      { message: "This request must come from this application." },
      { status: 403 },
    );
  }

  let courseRegistrationId = "";
  try {
    const body = (await req.json()) as { courseRegistrationId?: string };
    courseRegistrationId = body.courseRegistrationId ?? "";
  } catch {
    const form = await req.formData().catch(() => null);
    courseRegistrationId = String(form?.get("courseRegistrationId") ?? "");
  }
  if (!courseRegistrationId) {
    return NextResponse.json(
      { message: "Choose a registered course to open." },
      { status: 400 },
    );
  }

  const upstream = await fetch(
    `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/moodle/launch`,
    {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/json",
      },
      body: JSON.stringify({ courseRegistrationId }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  ).catch(() => null);

  if (!upstream) {
    return NextResponse.redirect(
      new URL("/student?moodleError=unavailable", req.url),
      303,
    );
  }
  if (!upstream.ok) {
    const detail = (await upstream.json().catch(() => ({}))) as {
      reason?: string;
      code?: string;
    };
    const reason = detail.reason ?? detail.code ?? "denied";
    return NextResponse.redirect(
      new URL(`/student?moodleError=${encodeURIComponent(reason)}`, req.url),
      303,
    );
  }

  const result = (await upstream.json()) as { launchUrl?: string | null };
  if (!result.launchUrl) {
    return NextResponse.redirect(
      new URL("/student?moodleError=no-destination", req.url),
      303,
    );
  }
  return NextResponse.redirect(result.launchUrl, 303);
}
