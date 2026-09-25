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

const results = [];
for (const target of targets) {
  try {
    const response = await fetch(target.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    const result = {
      target: target.name,
      status: response.status,
      location: response.headers.get("location"),
      body: text.slice(0, 500),
    };
    results.push(result);
    console.log(JSON.stringify(result));
  } catch (error) {
    const result = {
      target: target.name,
      error: error instanceof Error ? error.message : String(error),
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
}

const branch = results.find((item) => item.target === "branch frontend");
const production = results.find((item) => item.target === "production frontend");
const api = results.find((item) => item.target === "production API");

const branchProtected =
  branch &&
  (branch.status === 302 || branch.status === 401) &&
  JSON.stringify(branch).toLowerCase().includes("vercel");
const publicDemoHealthy = production?.status === 200 && api?.status === 200;

if (!branchProtected || !publicDemoHealthy) {
  console.error(
    "Unexpected Vercel protection topology: branch preview should be protected while public demo web/API remain reachable.",
  );
  process.exit(1);
}
