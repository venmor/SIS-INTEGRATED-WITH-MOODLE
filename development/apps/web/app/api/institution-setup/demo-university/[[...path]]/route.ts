import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "../../../../../lib/same-origin";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const path = (await params).path ?? [];
  const read = request.method === "GET" && path.length === 0;
  const write =
    request.method === "POST" &&
    (path.length === 0 ||
      (path.length === 2 && uuid.test(path[0]) && path[1] === "activate"));
  if (!read && !write)
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  const cursor = request.nextUrl.searchParams.get("beforeVersion");
  if (
    read &&
    ([...request.nextUrl.searchParams.keys()].some(
      (key) => key !== "beforeVersion",
    ) ||
      request.nextUrl.searchParams.getAll("beforeVersion").length > 1 ||
      (cursor !== null && !/^[1-9]\d{0,8}$/.test(cursor)))
  )
    return NextResponse.json(
      { message: "Use a valid version history reference." },
      { status: 400 },
    );
  if (write && !isSameOriginMutation(request))
    return NextResponse.json(
      { message: "This request must come from this application." },
      { status: 403 },
    );
  try {
    const upstream = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/institution-setup/demo-university${path.length ? `/${path.join("/")}` : ""}${read && cursor !== null ? `?beforeVersion=${cursor}` : ""}`,
      {
        method: request.method,
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          ...(write
            ? {
                "content-type": "application/json",
                "x-requested-with": "XMLHttpRequest",
              }
            : {}),
        },
        body: write ? request.body : undefined,
        duplex: "half",
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      } as RequestInit,
    );
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
        ...(upstream.headers.get("retry-after")
          ? { "retry-after": upstream.headers.get("retry-after")! }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: write
          ? "The outcome is uncertain. Check version history, then retry using the same request reference."
          : "Setup could not be checked. Try again.",
      },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
