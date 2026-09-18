import { NextRequest, NextResponse } from "next/server";
import { AUTH_MESSAGES } from "@sis/config";

// Same-origin proxy to the NestJS catalogue API (slice PH2-001). Reads are
// server-rendered directly against API_INTERNAL_URL, so this proxy carries
// only the two anonymous guidance POSTs. Deny-by-default path list; the CSRF
// marker is always set (same shape as the auth proxy — for anonymous routes
// it is a spam header only; abuse control is the per-IP rate limit). No
// cookies are forwarded (anonymous by design); upstream bodies pass through,
// never logged.
const API = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

// Handbook slice PH2-001 scope: guidance session start + requirement
// evaluation. Later-slice APIs belong here only when their task packets land.
const ALLOWED_POST = ["guidance/sessions", "guidance/evaluate"] as const;

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed." },
      { status: 405 },
    );
  }
  const { path } = await params;
  const joined = path.join("/");
  if (!(ALLOWED_POST as readonly string[]).includes(joined)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  const url = `${API}/catalogue/${joined}`;
  const headers: Record<string, string> = {
    "x-requested-with": "XMLHttpRequest",
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers,
      body: await req.text(),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return NextResponse.json(
      {
        message: `We could not reach the catalogue service. ${AUTH_MESSAGES.keptState.text}`,
      },
      { status: 503 },
    );
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const POST = proxy;
