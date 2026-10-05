import { cookies } from "next/headers";
import { Notice } from "@sis/ui";
import pageStyles from "../../../page.module.css";
import { RuleDraftForm, type RuleDraftReport } from "./rule-draft-form";

export const dynamic = "force-dynamic";

export default async function TimetableDemoRulesPage() {
  const sid = (await cookies()).get("sid")?.value;
  let report: RuleDraftReport | null = null;
  let status = 401;
  if (sid) {
    try {
      const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/timetabling/demo-rules`, {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` }, cache: "no-store",
      });
      status = response.status;
      if (response.ok) report = (await response.json()) as RuleDraftReport;
    } catch { status = 503; }
  }
  return <div className={pageStyles.page}><main className={pageStyles.main}>
    <p className={pageStyles.context}>Academic delivery · fictional rehearsal</p>
    <h1 className={pageStyles.title}>Timetable rules</h1>
    <p className={pageStyles.lede}>Set the limits for a fictional campus timetable preview. Each save creates a new draft version.</p>
    {!report ? <Notice severity="warning" title={status === 503 ? "Rules unavailable" : "Draft access unavailable"}
      message={status === 503 ? "The rules could not be loaded. Try again later." : "Use an active fictional campus domain appointment in the isolated demo environment."}
      action={{ label: "Back home", href: "/" }} /> : <RuleDraftForm initial={report} />}
  </main></div>;
}
