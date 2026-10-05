"use client";

import { useState } from "react";
import styles from "./rules.module.css";

interface TravelRow { fromCampus: string; toCampus: string; minutes: number }
interface Version {
  id: string; version: number; roomTurnaroundMinutes: number; maxOccurrences: number;
  campusTravelMinutes: TravelRow[]; createdAt: string;
  periodId: string | null; teachingStartDate: string | null; teachingEndDate: string | null;
  dailyStartTime: string | null; dailyEndTime: string | null;
  allowedWeekdays: number[] | null; maxSessionMinutes: number | null;
  planningPolicyComplete: boolean;
}
export interface RuleDraftReport { campusCode: string; status: "FICTIONAL_DRAFT_ONLY"; periods: { id: string; code: string }[]; versions: Version[] }

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function RuleDraftForm({ initial }: { initial: RuleDraftReport }) {
  const [report, setReport] = useState(initial);
  const latest = report.versions[0];
  const [turnaround, setTurnaround] = useState(latest?.roomTurnaroundMinutes ?? 10);
  const [limit, setLimit] = useState(latest?.maxOccurrences ?? 200);
  const [periodId, setPeriodId] = useState(latest?.periodId ?? initial.periods[0]?.id ?? "");
  const [teachingStartDate, setTeachingStartDate] = useState(latest?.teachingStartDate?.slice(0, 10) ?? "2026-10-05");
  const [teachingEndDate, setTeachingEndDate] = useState(latest?.teachingEndDate?.slice(0, 10) ?? "2026-12-18");
  const [dailyStartTime, setDailyStartTime] = useState(latest?.dailyStartTime ?? "08:00");
  const [dailyEndTime, setDailyEndTime] = useState(latest?.dailyEndTime ?? "18:00");
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>(latest?.allowedWeekdays ?? [1, 2, 3, 4, 5]);
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(latest?.maxSessionMinutes ?? 180);
  const [travel, setTravel] = useState<TravelRow[]>(latest?.campusTravelMinutes ?? []);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function changed() { setRequestId(null); setDirty(true); setMessage(""); setError(""); }
  async function refresh() {
    const response = await fetch("/api/timetabling/demo-rules", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the latest version.");
    setReport((await response.json()) as RuleDraftReport);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    try {
      const response = await fetch("/api/timetabling/demo-rules", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientRequestId: id, expectedVersion: latest?.version ?? 0,
          periodId, teachingStartDate, teachingEndDate, dailyStartTime, dailyEndTime,
          allowedWeekdays, maxSessionMinutes,
          roomTurnaroundMinutes: turnaround, maxOccurrences: limit, travel }),
      });
      const body = (await response.json()) as { message?: string; version?: number };
      if (!response.ok) {
        if (response.status === 409) { setRequestId(null); setError("The draft changed or this save reference was reused. Reload the latest version before saving."); }
        else if (response.status === 503) setError("Save status is uncertain. Reload the latest version before trying again.");
        else setError(body.message ?? "The draft could not be saved.");
        return;
      }
      await refresh();
      setRequestId(null);
      setDirty(false);
      setMessage(`Draft version ${body.version} saved. It has not been approved or published.`);
    } catch {
      setError("Save status is uncertain. Reload the latest version before trying again.");
    } finally { setPending(false); }
  }
  return <div className={styles.stack}>
    <div className={styles.banner}><strong>Fictional draft only</strong><span>Campus {report.campusCode} · no student timetable is published from these rules.</span></div>
    <form onSubmit={save} className={styles.form}>
      <div className={styles.header}><div><h2>Version {latest?.version ?? 0} → new draft</h2><p>Change the limits used in the synthetic conflict preview.</p></div>
        <button type="button" className={styles.secondary} disabled={pending} onClick={async () => { try { await refresh(); setRequestId(null); setMessage("Latest version loaded. Your edited values remain until you change or save them."); setError(""); } catch { setError("Could not load the latest version."); } }}>Reload latest</button></div>
      <div className={styles.fields}>
        <label>Academic period <span>Fictional period for this rule version</span><select required value={periodId} onChange={e => { changed(); setPeriodId(e.target.value); }}><option value="">Select a period</option>{report.periods.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></label>
        <label>Teaching starts <span>First permitted date</span><input type="date" required value={teachingStartDate} onChange={e => { changed(); setTeachingStartDate(e.target.value); }} /></label>
        <label>Teaching ends <span>Last permitted date</span><input type="date" required min={teachingStartDate} value={teachingEndDate} onChange={e => { changed(); setTeachingEndDate(e.target.value); }} /></label>
        <label>Daily start <span>Local time in Zambia</span><input type="time" required value={dailyStartTime} onChange={e => { changed(); setDailyStartTime(e.target.value); }} /></label>
        <label>Daily end <span>Local time in Zambia</span><input type="time" required min={dailyStartTime} value={dailyEndTime} onChange={e => { changed(); setDailyEndTime(e.target.value); }} /></label>
        <label>Longest session <span>15–480 minutes</span><input type="number" min="15" max="480" required value={maxSessionMinutes} onChange={e => { changed(); setMaxSessionMinutes(Number(e.target.value)); }} /></label>
        <label>Room turnaround <span>Minutes between uses of one room</span><input type="number" min="0" max="120" required value={turnaround} onChange={e => { changed(); setTurnaround(Number(e.target.value)); }} /></label>
        <label>Draft size limit <span>Maximum teaching sessions per preview</span><input type="number" min="1" max="500" required value={limit} onChange={e => { changed(); setLimit(Number(e.target.value)); }} /></label>
      </div>
      <fieldset className={styles.days}><legend>Teaching weekdays</legend>{weekdays.map((day, index) => <label key={day}><input type="checkbox" checked={allowedWeekdays.includes(index + 1)} onChange={e => { changed(); setAllowedWeekdays(e.target.checked ? [...allowedWeekdays, index + 1].sort() : allowedWeekdays.filter(value => value !== index + 1)); }} />{day}</label>)}</fieldset>
      <div className={styles.header}><div><h3>Campus travel time</h3><p>Directed routes only. Add the reverse direction separately if needed.</p></div><button type="button" className={styles.secondary} disabled={pending || travel.length >= 50} onClick={() => { changed(); setTravel([...travel, { fromCampus: "", toCampus: "", minutes: 0 }]); }}>Add route</button></div>
      {travel.map((row, index) => <div className={styles.route} key={index}>
        <label>From campus<input aria-label={`Route ${index + 1} from campus`} placeholder="DEMO-MAIN" required value={row.fromCampus} onChange={e => { changed(); setTravel(travel.map((item, i) => i === index ? { ...item, fromCampus: e.target.value.toUpperCase() } : item)); }} /></label>
        <label>To campus<input aria-label={`Route ${index + 1} to campus`} placeholder="DEMO-HEALTH" required value={row.toCampus} onChange={e => { changed(); setTravel(travel.map((item, i) => i === index ? { ...item, toCampus: e.target.value.toUpperCase() } : item)); }} /></label>
        <label>Minutes<input aria-label={`Route ${index + 1} minutes`} type="number" min="0" max="240" required value={row.minutes} onChange={e => { changed(); setTravel(travel.map((item, i) => i === index ? { ...item, minutes: Number(e.target.value) } : item)); }} /></label>
        <button type="button" className={styles.secondary} onClick={() => { changed(); setTravel(travel.filter((_, i) => i !== index)); }}>Remove</button>
      </div>)}
      <div className={styles.actions}><button className={styles.primary} disabled={pending} type="submit">{pending ? "Saving draft…" : "Save new draft"}</button><span aria-live="polite">{pending ? "Saving…" : message || (dirty ? "Changes not yet saved" : "")}</span></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
    <section className={styles.history}><h2>Draft history</h2>{report.versions.length ? <ol>{report.versions.map(v => <li key={v.id}><strong>Version {v.version}</strong><span>{new Date(v.createdAt).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })}</span><span>{v.planningPolicyComplete ? `${report.periods.find(p => p.id === v.periodId)?.code ?? "Fictional period"} · ${v.teachingStartDate?.slice(0, 10)} to ${v.teachingEndDate?.slice(0, 10)} · ${v.dailyStartTime}–${v.dailyEndTime}` : "Incomplete for dated planning"}</span><span>{v.roomTurnaroundMinutes} min room turnaround · {v.maxOccurrences} sessions · {v.campusTravelMinutes.length} routes</span></li>)}</ol> : <p>No draft has been saved for this campus.</p>}</section>
  </div>;
}
