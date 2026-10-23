import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";

// Same-origin proxy to the NestJS Moodle provisioning API.
// Only the delegation workspace paths are exposed; everything else is 404.
const uuid = "[0-9a-fA-F-]{36}";
const reads = new RegExp(`^(provision|provision/students/search)$`);
const writes = new RegExp(`^(provision|provision/${uuid}/revoke)$`);

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const segments = (await params).path ?? [];
  const path = segments.join("/");
  const permitted =
    (req.method === "GET" && reads.test(path)) ||
    (req.method === "POST" && writes.test(path));
  if (!permitted)
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
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/moodle${path ? `/${path}` : ""}${req.nextUrl.search}`,
      {
        method: req.method,
        headers,
        body: req.method === "POST" ? req.body : undefined,
        duplex: "half",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      } as RequestInit,
    );
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "The Moodle provisioning service could not be reached. Try again shortly.",
      },
      { status: 502 },
    );
  }
}

export { proxy as GET, proxy as POST };
