import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";

// Same-origin proxy to the NestJS registration API (TASK-PH4-003/004/005).
// Readiness, draft plans, submit, status and timetable only; every other
// method or path is refused.
const reads = new RegExp(`^(readiness|plan|status|timetable|amendments|waitlist)$`);

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const segments = (await params).path ?? [];
  const path = segments.join("/");
  const query = req.nextUrl.search ?? "";
  const uuid = "[a-fA-F0-9-]{36}";
  const isRead = req.method === "GET" && reads.test(path);
  const isWrite =
    req.method === "POST" &&
    new RegExp(
      `^(plan|submit|changes|amendments/${uuid}/decide|waitlist|waitlist/${uuid}/decide)$`,
    ).test(path);
  if (!isRead && !isWrite)
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (!isSameOriginMutation(req))
    return NextResponse.json(
      { message: "This request must come from this application." },
      { status: 403 },
    );
  const headers: Record<string, string> = {
    cookie: req.headers.get("cookie") ?? "",
    "x-requested-with": "XMLHttpRequest",
  };
  if (req.headers.get("content-type"))
    headers["content-type"] = req.headers.get("content-type")!;
  try {
    const upstream = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/registration${path ? `/${path}` : ""}${query}`,
      {
        method: req.method,
        headers,
        body: req.method === "POST" ? req.body : undefined,
        duplex: "half",
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      } as RequestInit,
    );
    const outHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const key of [
      "content-type",
      "retry-after",
      "referrer-policy",
    ])
      if (upstream.headers.has(key))
        outHeaders.set(key, upstream.headers.get(key)!);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "We could not confirm the saved result. Keep this page open and check the current state before retrying.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
