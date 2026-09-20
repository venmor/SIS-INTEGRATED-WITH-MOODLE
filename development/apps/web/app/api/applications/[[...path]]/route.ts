import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";
const uuid = "[a-fA-F0-9-]{36}";
const reads = new RegExp(
  `^(|policy|commands/${uuid}|${uuid}(/review|/receipt|/documents/${uuid}/content)?)$`,
);
const writes = new RegExp(
  `^(|${uuid}/(sections/(personal|contact|qualifications)|documents|documents/${uuid}/scan|change-programme|discard|submit))$`,
);
async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const path = (await params).path?.join("/") ?? "";
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
    // Stream multipart bodies; the API enforces file/field limits before persistence.
    const upstream = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/applications${path ? `/${path}` : ""}`,
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
      "content-disposition",
      "content-security-policy",
      "x-content-type-options",
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
          "We could not confirm the saved result. Keep this page open and check the result before retrying.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
