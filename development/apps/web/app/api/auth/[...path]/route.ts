import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy to the NestJS API (slice 2a). The browser never talks to
// the API directly (no CORS), cookies stay httpOnly, and this layer always sets
// the CSRF marker the API requires. Tokens/passwords are forwarded, never
// logged. Only slice-2a auth paths are proxied; everything else is refused.
// Non-GET/POST methods are refused.
const API = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

// Handbook slice-2 + slice-3 scope only: sign-in/out, own record, recovery,
// demo token, demo-visible policy, workspace switch, grants. Later-slice APIs
// belong here only when their task packets land.
const ALLOWED: Record<string, readonly string[]> = {
  GET: ["me", "policy", "demo/recovery-token"],
  POST: ["sign-in", "sign-out", "recovery/request", "recovery/confirm", "workspace/switch", "grants"],
};

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
  }
  const { path } = await params;
  const joined = path.join("/");
  if (!ALLOWED[req.method]?.includes(joined)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  const url = `${API}/auth/${joined}${req.nextUrl.search}`;
  const headers: Record<string, string> = { "x-requested-with": "XMLHttpRequest" };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === "POST" ? await req.text() : undefined,
    });
  } catch {
    return NextResponse.json(
      { message: "We could not reach the sign-in service. Check your connection and try again." },
      { status: 503 },
    );
  }
  const body = await upstream.text();
  const res = new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
  const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = typeof getSetCookie === "function" ? getSetCookie.call(upstream.headers) : [];
  if (cookies.length > 0) {
    for (const cookie of cookies) res.headers.append("set-cookie", cookie);
  } else {
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);
  }
  return res;
}

export const GET = proxy;
export const POST = proxy;
