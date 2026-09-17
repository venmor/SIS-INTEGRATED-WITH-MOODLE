import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy to the NestJS API (slice 2a). The browser never talks to
// the API directly (no CORS), cookies stay httpOnly, and this layer always sets
// the CSRF marker the API requires. Tokens/passwords are forwarded, never
// logged. Only slice-2a auth paths are proxied; everything else is refused.
// Non-GET/POST methods are refused.
const API = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

// Handbook slice-2 + slice-3 + slice-4 + slice-5 scope: sign-in/out, own
// record, recovery, demo token, demo-visible policy, workspace switch,
// expiry warnings, grants, grant-target resolve, command receipts, access
// reviews (+decide), reinstatement, break-glass, audit timeline.
// Later-slice APIs belong here only when their task packets land.
const ALLOWED: Record<string, readonly string[]> = {
  GET: [
    "me",
    "policy",
    "demo/recovery-token",
    "audit/timeline",
    "reviews",
    "workspace/expiry-warnings",
  ],
  POST: [
    "sign-in",
    "sign-out",
    "recovery/request",
    "recovery/confirm",
    "workspace/switch",
    "grants",
    "grants/resolve",
    "break-glass",
    "reinstate",
  ],
};

// Dynamic exceptions with requester-scoped server checks:
// - receipt lookup carries the idempotency key (GET commands/:key)
// - single review read carries the schedule id (GET reviews/:id)
// - review decide carries the schedule id (POST reviews/:id/decide)
// - warning ack carries the warning id (POST workspace/expiry-warnings/:id/ack)
function allowedPath(method: string, path: string[]): boolean {
  if (ALLOWED[method]?.includes(path.join("/"))) return true;
  if (
    method === "GET" &&
    path.length === 2 &&
    path[0] === "commands" &&
    path[1].length > 0
  )
    return true;
  if (
    method === "GET" &&
    path.length === 2 &&
    path[0] === "reviews" &&
    path[1].length > 0
  )
    return true;
  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "reviews" &&
    path[1].length > 0 &&
    path[2] === "decide"
  )
    return true;
  if (
    method === "POST" &&
    path.length === 3 &&
    path[0] === "break-glass" &&
    path[1].length > 0 &&
    path[2] === "review"
  )
    return true;
  if (
    method === "POST" &&
    path.length === 4 &&
    path[0] === "workspace" &&
    path[1] === "expiry-warnings" &&
    path[2].length > 0 &&
    path[3] === "ack"
  )
    return true;
  return false;
}

// Query keys the API reads per path family; everything else is stripped,
// never proxied verbatim (deny-by-default on filter surface).
const QUERY_KEYS: Record<string, readonly string[]> = {
  "demo/recovery-token": ["username"],
  "audit/timeline": [
    "actorAccountId",
    "role",
    "scope",
    "action",
    "correlationId",
    "startDate",
    "endDate",
    "skip",
    "take",
  ],
  reviews: ["riskLevel", "status", "reviewerId", "skip", "take"],
};

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed." },
      { status: 405 },
    );
  }
  const { path } = await params;
  const joined = path.join("/");
  if (!allowedPath(req.method, path)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  // Forward only the query keys the API reads for this path family;
  // everything else is stripped, never proxied verbatim. Empty strings are
  // forwarded as-is (fail-closed at the API's whitelist validation) rather
  // than silently dropped into a broader query.
  const search = new URLSearchParams();
  for (const key of QUERY_KEYS[joined] ?? []) {
    const value = req.nextUrl.searchParams.get(key);
    if (value !== null) search.set(key, value);
  }
  const url = `${API}/auth/${joined}${search.size > 0 ? `?${search}` : ""}`;
  const headers: Record<string, string> = {
    "x-requested-with": "XMLHttpRequest",
  };
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
      // A hanging API must not hang the page: fail to the 503 below.
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "We could not reach the sign-in service. Check your connection and try again.",
      },
      { status: 503 },
    );
  }
  const body = await upstream.text();
  const res = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
  const getSetCookie = (
    upstream.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const cookies =
    typeof getSetCookie === "function"
      ? getSetCookie.call(upstream.headers)
      : [];
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
