import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../lib/same-origin";

async function proxy(req: NextRequest) {
  if (req.method === "POST" && !isSameOriginMutation(req))
    return NextResponse.json({ message: "This request must come from this application." }, { status: 403 });
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/timetabling/demo-rules`, {
      method: req.method,
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        ...(req.method === "POST" ? { "content-type": "application/json" } : {}),
      },
      body: req.method === "POST" ? req.body : undefined,
      duplex: "half",
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    } as RequestInit);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ message: "Save status is uncertain. Reload and check the latest version before retrying." }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
