/** Validate browser writes before a proxy adds its trusted API CSRF marker. */
export function isSameOriginMutation(request: {
  method: string;
  headers: Headers;
  url: string;
}): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const expected = new URL(request.url);
      const host = request.headers.get("host");
      // Host is set by the browser, unlike arbitrary forwarded-host headers.
      if (host) expected.host = host;
      return new URL(origin).origin === expected.origin;
    } catch {
      return false;
    }
  }
  // Some same-origin clients omit Origin. Browser-controlled Fetch Metadata
  // is acceptable proof; missing proof fails closed, including curl scripts.
  return request.headers.get("sec-fetch-site") === "same-origin";
}
