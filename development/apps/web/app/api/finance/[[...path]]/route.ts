import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";

// Same-origin proxy to the NestJS finance API (TASK-PH5-001/002/003).
// Reads plus student payment initiation/reporting in these slices; every
// other method or path is refused.
const uuid = "[0-9a-fA-F-]{36}";
const reads = new RegExp(
  `^(invoices|account|statement|receipts/[A-Za-z0-9-]+|payments|payments/PAY-[0-9-]+|cases|cases/${uuid}|sponsorships|adjustments|arrangements)$`,
);

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const segments = (await params).path ?? [];
  const path = segments.join("/");
  const query = req.nextUrl.search ?? "";
  const isRead = req.method === "GET" && reads.test(path);
  const isWrite =
    req.method === "POST" &&
    new RegExp(
      `^(payments/initiate|payments/report|simulator/dispatch|cases/${uuid}/resolve|sponsorships|sponsorships/${uuid}/confirm|adjustments|adjustments/${uuid}/decide|arrangements|arrangements/${uuid}/decide|cashier/intake|cashier/confirm)$`,
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
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/finance${path ? `/${path}` : ""}${query}`,
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
      "set-cookie",
    ] as const) {
      const value = upstream.headers.get(key);
      if (value) outHeaders.set(key, value);
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: "The finance service could not be reached. Try again shortly." },
      { status: 502 },
    );
  }
}

export { proxy as GET, proxy as POST };
