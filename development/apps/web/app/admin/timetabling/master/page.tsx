import { cookies } from "next/headers";
import { Notice } from "@sis/ui";
import pageStyles from "../../../page.module.css";
import { MasterPlanner, type Catalogue, type MasterDraft } from "./planner";

export const dynamic = "force-dynamic";

export default async function MasterTimetablePage() {
  const sid = (await cookies()).get("sid")?.value;
  let catalogue: Catalogue | null = null;
  let history: MasterDraft[] = [];
  if (sid) {
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
    const headers = { cookie: `sid=${encodeURIComponent(sid)}` };
    try {
      const [source, drafts] = await Promise.all([
        fetch(`${api}/timetabling/demo-master/catalogue`, { headers, cache: "no-store" }),
        fetch(`${api}/timetabling/demo-master`, { headers, cache: "no-store" }),
      ]);
      if (source.ok && drafts.ok) {
        catalogue = (await source.json()) as Catalogue;
        history = (await drafts.json()) as MasterDraft[];
      }
    } catch { /* Preserve restricted/unavailable state. */ }
  }
  return <div className={pageStyles.page}><main className={pageStyles.main}>
    <p className={pageStyles.context}>Academic delivery · fictional rehearsal</p>
    <h1 className={pageStyles.title}>Master timetable preview</h1>
    <p className={pageStyles.lede}>Plan sessions across courses in one period. Course previews come from the same saved master version.</p>
    {!catalogue ? <Notice severity="warning" title="Preview unavailable"
      message="Use an active fictional central timetable appointment in the isolated demo environment. No draft content was disclosed."
      action={{ label: "Back home", href: "/" }} /> :
      <MasterPlanner initialCatalogue={catalogue} initialHistory={history} />}
  </main></div>;
}
