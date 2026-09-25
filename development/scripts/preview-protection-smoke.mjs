const targets = [
  {
    name: "branch frontend",
    url: "https://sis-moodle-git-demo-v2-readiness-charles-chitundu.vercel.app/api/auth/policy",
  },
  {
    name: "production frontend",
    url: "https://sis-moodle.vercel.app/api/auth/policy",
  },
  {
    name: "production API",
    url: "https://sis-moodle-api.vercel.app/api/auth/policy",
  },
];

let failed = false;
for (const target of targets) {
  try {
    const response = await fetch(target.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    console.log(
      JSON.stringify({
        target: target.name,
        status: response.status,
        location: response.headers.get("location"),
        body: text.slice(0, 500),
      }),
    );
    if (response.status !== 200) failed = true;
  } catch (error) {
    failed = true;
    console.log(
      JSON.stringify({
        target: target.name,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

if (failed) process.exit(1);
