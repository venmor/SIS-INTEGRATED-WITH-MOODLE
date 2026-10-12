import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../../lib/same-origin";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const path = (await params).path ?? [];
  const isReview =
    path.length === 2 &&
    /^[a-fA-F0-9-]{36}$/.test(path[0]) &&
    path[1] === "publication-review";
  const isDraftHistory = path.length === 1 && path[0] === "draft-history";
  const allowedRead =
    req.method === "GET" &&
    (path.length === 0 ||
      isReview ||
      isDraftHistory ||
      (path.length === 1 && ["catalogue", "permissions"].includes(path[0])) ||
      (path.length === 3 &&
        /^[a-fA-F0-9-]{36}$/.test(path[0]) &&
        path[1] === "course" &&
        /^[A-Z]{2,8}[0-9]{2,5}$/.test(path[2])));
  const allowedWrite =
    req.method === "POST" &&
    (path.length === 0 ||
      (path.length === 2 &&
        /^[a-fA-F0-9-]{36}$/.test(path[0]) &&
        path[1] === "publish"));
  if (!allowedRead && !allowedWrite)
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  const query = req.nextUrl.searchParams;
  const validUuid = (value: string | null) =>
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value ?? "",
    );
  const allowedQuery = isReview
    ? ["beforeVersion", "clientRequestId"]
    : isDraftHistory
      ? ["periodId", "beforeVersion"]
      : [];
  if (
    [...query.keys()].some(
      (key) =>
        !allowedQuery.includes(key) ||
        req.method !== "GET" ||
        query.getAll(key).length !== 1,
    ) ||
    (query.has("beforeVersion") &&
      !/^[1-9]\d{0,8}$/.test(query.get("beforeVersion") ?? "")) ||
    (query.has("clientRequestId") &&
      !validUuid(query.get("clientRequestId"))) ||
    (isDraftHistory && !validUuid(query.get("periodId")))
  )
    return NextResponse.json(
      { message: "Use a valid period and history reference." },
      { status: 400 },
    );
  if (!isSameOriginMutation(req))
    return NextResponse.json(
      { message: "This request must come from this application." },
      { status: 403 },
    );
  try {
    const upstream = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/timetabling/demo-master${path.length ? `/${path.join("/")}` : ""}${query.size ? `?${query.toString()}` : ""}`,
      {
        method: req.method,
        headers: {
          cookie: req.headers.get("cookie") ?? "",
          ...(allowedWrite
            ? {
                "content-type": "application/json",
                "x-requested-with": "XMLHttpRequest",
              }
            : {}),
        },
        body: allowedWrite ? req.body : undefined,
        duplex: "half",
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      } as RequestInit,
    );
    const headers = new Headers({
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    });
    const retry = upstream.headers.get("retry-after");
    if (retry) headers.set("retry-after", retry);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "Save status is uncertain. Reload the master history before retrying.",
      },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
