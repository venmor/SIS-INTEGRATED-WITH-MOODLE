import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../../lib/same-origin";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path ?? [];
  const allowedRead = req.method === "GET" && (path.length === 0 ||
    (path.length === 1 && path[0] === "catalogue") ||
    (path.length === 3 && /^[a-fA-F0-9-]{36}$/.test(path[0]) && path[1] === "course" && /^[A-Z]{2,8}[0-9]{2,5}$/.test(path[2])));
  const allowedWrite = req.method === "POST" && path.length === 0;
  if (!allowedRead && !allowedWrite) return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (!isSameOriginMutation(req)) return NextResponse.json({ message: "This request must come from this application." }, { status: 403 });
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/timetabling/demo-master${path.length ? `/${path.join("/")}` : ""}`, {
      method: req.method,
      headers: { cookie: req.headers.get("cookie") ?? "", ...(allowedWrite ? { "content-type": "application/json" } : {}) },
      body: allowedWrite ? req.body : undefined,
      duplex: "half", cache: "no-store", signal: AbortSignal.timeout(25000),
    } as RequestInit);
    return new NextResponse(upstream.body, { status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Save status is uncertain. Reload the master history before retrying." }, { status: 503 });
  }
}
export const GET = proxy;
export const POST = proxy;
