import { cookies } from "next/headers";
import { Notice } from "@sis/ui";
import type { DemoUniversitySetupReport } from "@sis/contracts";
import pageStyles from "../../../page.module.css";
import { UniversitySetupEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function UniversitySetupPage() {
  const sid = (await cookies()).get("sid")?.value;
  let report: DemoUniversitySetupReport | null = null;
  let status = sid ? 503 : 401;
  if (sid) {
    try {
      const response = await fetch(
        `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/institution-setup/demo-university`,
        {
          headers: { cookie: `sid=${encodeURIComponent(sid)}` },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      status = response.status;
      if (response.ok)
        report = (await response.json()) as DemoUniversitySetupReport;
    } catch {
      /* Keep the unavailable state without exposing connection details. */
    }
  }
  return (
    <div className={pageStyles.page}>
      <main className={pageStyles.main}>
        <p className={pageStyles.context}>
          Institution setup · fictional university
        </p>
        <h1 className={pageStyles.title}>University structure and calendar</h1>
        <p className={pageStyles.lede}>
          Prepare a version, review its changes, then activate it through
          independent approval.
        </p>
        {report ? (
          <UniversitySetupEditor initialReport={report} />
        ) : (
          <Notice
            severity="warning"
            title={
              status === 401 || status === 403 || status === 404
                ? "Setup unavailable"
                : "Setup could not be checked"
            }
            message={
              status === 401 || status === 403 || status === 404
                ? "Use an active fictional university setup appointment in the isolated demo environment."
                : "No setup status was confirmed. Reload this page to check again."
            }
            action={{ label: "Workspace home", href: "/" }}
          />
        )}
      </main>
    </div>
  );
}
