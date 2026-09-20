import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginMutation } from "../apps/web/lib/same-origin.ts";
const request = (headers = {}, method = "POST") => ({
  method,
  headers: new Headers(headers),
  url: "https://sis.example/api/auth/sign-in",
});
test("same-origin browser mutations pass, cross-site login CSRF fails", () => {
  assert.equal(
    isSameOriginMutation(request({ origin: "https://sis.example" })),
    true,
  );
  assert.equal(
    isSameOriginMutation(request({ origin: "https://attacker.example" })),
    false,
  );
  assert.equal(isSameOriginMutation(request({ origin: "null" })), false);
  assert.equal(isSameOriginMutation(request({ origin: "garbage" })), false);
});
test("missing Origin requires browser-controlled same-origin proof", () => {
  assert.equal(
    isSameOriginMutation(request({ "sec-fetch-site": "same-origin" })),
    true,
  );
  assert.equal(
    isSameOriginMutation(request({ "sec-fetch-site": "same-site" })),
    false,
  );
  assert.equal(
    isSameOriginMutation(request({ "sec-fetch-site": "cross-site" })),
    false,
  );
  assert.equal(isSameOriginMutation(request()), false);
  assert.equal(isSameOriginMutation(request({}, "GET")), true);
});
test("uses the browser Host when the web server normalizes its internal URL", () => {
  assert.equal(
    isSameOriginMutation({
      method: "POST",
      url: "http://localhost:3100/api/auth/sign-in",
      headers: new Headers({
        host: "127.0.0.1:3100",
        origin: "http://127.0.0.1:3100",
      }),
    }),
    true,
  );
  assert.equal(
    isSameOriginMutation({
      method: "POST",
      url: "http://localhost:3100/api/auth/sign-in",
      headers: new Headers({
        host: "127.0.0.1:3100",
        origin: "https://foreign.invalid",
      }),
    }),
    false,
  );
});
