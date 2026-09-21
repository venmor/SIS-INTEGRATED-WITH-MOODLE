import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";

// Same-origin proxy to the NestJS review API (TASK-PH3-001/002). The browser
// never talks to the API directly (no CORS), cookies stay httpOnly, and this
// layer always sets the CSRF marker the API requires. Only staff review paths
// are proxied; everything else is refused. Non-GET/POST methods are refused.
const uuid = "[a-fA-F0-9-]{36}";
const reads = new RegExp(
  `^(queue|queue/${uuid}|${uuid}/evidence|${uuid}/findings)$`,
);
const writes = new RegExp(
  `^(${uuid}/(claim|release|findings|clarifications)|corrections/${uuid}/decide)$`,
);

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const segments = (await params).path ?? [];
  const path = segments.join("/");
  const query = req.nextUrl.search ?? "";
  if (!(req.method === "GET" ? reads : writes).test(path))
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
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/review${path ? `/${path}` : ""}${query}`,
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
          "We could not confirm the saved result. Keep this page open and check the queue state before retrying.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
