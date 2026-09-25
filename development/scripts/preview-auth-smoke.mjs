const base =
  process.env.PREVIEW_BASE_URL ??
  "https://sis-moodle-git-demo-v2-readiness-charles-chitundu.vercel.app";

const checks = [];

async function request(path, init = {}) {
  const url = new URL(path, base);
  const response = await fetch(url, {
    redirect: "manual",
    ...init,
    headers: {
      origin: new URL(base).origin,
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 300);
  }
  return {
    status: response.status,
    body,
    hasSessionCookie: Boolean(response.headers.get("set-cookie")),
  };
}

async function run() {
  const policy = await request("/api/auth/policy");
  checks.push({ name: "auth policy", ...policy });

  for (const [username, password] of [
    ["bwalya.m", "Seed-2026-Bwalya"],
    ["phiri.n", "Seed-2026-Phiri"],
    ["mumba.s", "Seed-2026-Mumba"],
    ["kunda.b", "Seed-2026-Kunda"],
  ]) {
    const result = await request("/api/auth/sign-in", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({ username, password }),
    });
    checks.push({
      name: `sign-in ${username}`,
      status: result.status,
      body: result.body,
      hasSessionCookie: result.hasSessionCookie,
    });
  }

  for (const item of checks) {
    console.log(JSON.stringify(item));
  }

  const policyOk = checks[0]?.status === 200;
  const signIns = checks.slice(1);
  const successful = signIns.filter(
    (item) => item.status === 200 && item.hasSessionCookie,
  );
  if (!policyOk || successful.length !== signIns.length) {
    console.error(
      `Preview auth smoke failed: policy=${checks[0]?.status}, successful sign-ins=${successful.length}/${signIns.length}`,
    );
    process.exit(1);
  }
}

await run().catch((error) => {
  console.error("Preview auth smoke could not complete:", error);
  process.exit(1);
});
