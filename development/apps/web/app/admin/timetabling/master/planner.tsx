"use client";

import { useState } from "react";
import styles from "./planner.module.css";

export interface Catalogue {
  periods: { id: string; code: string }[];
  rules: { id: string; periodId: string; version: number; campusCode: string }[];
  sections: { id: string; code: string; courseCode: string; periodId: string; campusCode: string; capacity: number }[];
  venues: { id: string; code: string; campusCode: string; teachingCapacity: number; stepFreeAccess: boolean | null }[];
  teachers: { id: string; sectionId: string; label: string }[];
  registrations: { id: string; courseCode: string; periodId: string; label: string }[];
}
interface DraftSession {
  id: string; sectionId: string; venueId: string; teacherAssignmentId: string;
  registrationIds: string[]; startLocal: string; endLocal: string;
  plannedSeats: number; requiresStepFreeAccess: boolean;
}
interface SavedSession extends Omit<DraftSession, "startLocal" | "endLocal"> {
  startAt: string; endAt: string; courseCode: string; sectionCode: string; campusCode: string; venueCode: string;
}
interface Issue { code: string; occurrenceIds: string[] }
export interface MasterDraft { id: string; periodId: string; version: number; ruleDraftId: string;
  status: "BLOCKED" | "CONFLICT_FREE_FOR_REVIEW"; sessions: SavedSession[]; issues: Issue[]; createdAt: string }
interface CoursePreview { masterDraftId: string; version: number; status: string; courseCode: string;
  sessions: SavedSession[]; issues: Issue[]; createdAt: string }

const issueLabels: Record<string, string> = {
  ROSTER_UNVERIFIED: "No registered learners linked", ROOM_CONFLICT: "Room double-booked",
  ROOM_TURNAROUND: "Room turnaround too short", TEACHER_CONFLICT: "Lecturer double-booked",
  STUDENT_CONFLICT: "Student double-booked", TEACHER_TRAVEL: "Lecturer travel too short",
  STUDENT_TRAVEL: "Student travel too short", TRAVEL_POLICY_MISSING: "Campus travel rule missing",
  VENUE_CAPACITY: "Capacity exceeded", VENUE_ACCESSIBILITY: "Required access unavailable",
  OUTSIDE_TEACHING_WINDOW: "Outside teaching window", SESSION_TOO_LONG: "Session too long",
  INVALID_TIME: "Invalid time", DRAFT_LIMIT: "Too many sessions",
  SECTION_MEMBERSHIP_CONFLICT: "Student mapped to two sections", COVERAGE_INCOMPLETE: "Some course sections not scheduled",
  SEAT_PLAN_INSUFFICIENT: "Planned seats below registered learners",
};
function localInput(value: string) { return `${value}:00+02:00`; }
function newSession(): DraftSession { return { id: crypto.randomUUID(), sectionId: "", venueId: "", teacherAssignmentId: "",
  registrationIds: [], startLocal: "2026-10-05T08:00", endLocal: "2026-10-05T09:00",
  plannedSeats: 20, requiresStepFreeAccess: false }; }
function displayDate(value: string) { return new Date(value).toLocaleString("en-ZM", { timeZone: "Africa/Lusaka", dateStyle: "medium", timeStyle: "short" }); }

export function MasterPlanner({ initialCatalogue, initialHistory }: { initialCatalogue: Catalogue; initialHistory: MasterDraft[] }) {
  const [history, setHistory] = useState(initialHistory);
  const [periodId, setPeriodId] = useState(initialCatalogue.periods[0]?.id ?? "");
  const [ruleDraftId, setRuleDraftId] = useState(initialCatalogue.rules.find(r => r.periodId === initialCatalogue.periods[0]?.id)?.id ?? "");
  const [sessions, setSessions] = useState<DraftSession[]>([newSession()]);
  const [selectedDraftId, setSelectedDraftId] = useState(initialHistory[0]?.id ?? "");
  const [course, setCourse] = useState("");
  const [coursePreview, setCoursePreview] = useState<CoursePreview | null>(null);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = history.find(d => d.id === selectedDraftId);
  const selectedPeriod = initialCatalogue.periods.find(p => p.id === periodId);
  const periodRules = initialCatalogue.rules.filter(r => r.periodId === periodId);
  const periodSections = initialCatalogue.sections.filter(s => s.periodId === periodId);
  function changed() { setDirty(true); setRequestId(null); setMessage(""); setError(""); }
  function update(index: number, patch: Partial<DraftSession>) {
    changed(); setSessions(list => list.map((item, i) => i === index ? { ...item, ...patch } : item));
  }
  async function reload() {
    const res = await fetch("/api/timetabling/demo-master", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load the master history.");
    const data = (await res.json()) as MasterDraft[];
    setHistory(data); setSelectedDraftId(data[0]?.id ?? ""); setCourse(""); setCoursePreview(null);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const id = requestId ?? crypto.randomUUID(); setRequestId(id);
    try {
      const latest = history.find(d => d.periodId === periodId);
      const response = await fetch("/api/timetabling/demo-master", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientRequestId: id, expectedVersion: latest?.version ?? 0, periodId, ruleDraftId,
          sessions: sessions.map(s => ({ id: s.id, sectionId: s.sectionId, venueId: s.venueId,
            teacherAssignmentId: s.teacherAssignmentId, registrationIds: s.registrationIds,
            startAt: localInput(s.startLocal), endAt: localInput(s.endLocal),
            plannedSeats: s.plannedSeats, requiresStepFreeAccess: s.requiresStepFreeAccess })) }),
      });
      const body = (await response.json()) as { message?: string; version?: number; status?: string };
      if (!response.ok) {
        if (response.status === 409) { setRequestId(null); setError("The master draft changed. Reload history before saving again."); }
        else if (response.status === 503) setError("Save status is uncertain. Reload history before retrying.");
        else setError(body.message ?? "The draft could not be saved.");
        return;
      }
      await reload(); setDirty(false); setRequestId(null);
      setMessage(`Master version ${body.version} saved · ${body.status === "BLOCKED" ? "conflicts need attention" : "conflict-free for review only"}.`);
    } catch { setError("Save status is uncertain. Reload history before retrying."); }
    finally { setPending(false); }
  }
  async function chooseCourse(code: string) {
    setCourse(code); setCoursePreview(null); setError("");
    if (!selected || !code) return;
    try {
      const response = await fetch(`/api/timetabling/demo-master/${selected.id}/course/${code}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setCoursePreview((await response.json()) as CoursePreview);
    } catch { setError("Course preview could not be loaded."); }
  }
  const displayed = course ? coursePreview?.sessions ?? [] : selected?.sessions ?? [];
  const issues = course ? coursePreview?.issues ?? [] : selected?.issues ?? [];
  return <div className={styles.stack}>
    <div className={styles.banner}><strong>Draft preview only</strong><span>No sessions are published to students from this workspace.</span></div>
    <form className={styles.panel} onSubmit={save}>
      <div className={styles.heading}><div><h2>Plan sessions</h2><p>One master version holds every course session for the selected period.</p></div>
        <button type="button" onClick={() => { changed(); setSessions([...sessions, newSession()]); }} disabled={sessions.length >= 100 || pending}>Add session</button></div>
      <div className={styles.filters}>
        <label>Academic period<select required value={periodId} onChange={e => { changed(); const next = e.target.value; setPeriodId(next); setRuleDraftId(initialCatalogue.rules.find(r => r.periodId === next)?.id ?? ""); }}><option value="">Select period</option>{initialCatalogue.periods.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}</select></label>
        <label>Rule version<select required value={ruleDraftId} onChange={e => { changed(); setRuleDraftId(e.target.value); }}><option value="">Select complete rule</option>{periodRules.map(r => <option key={r.id} value={r.id}>{r.campusCode} · version {r.version}</option>)}</select></label>
      </div>
      {!periodRules.length && <p className={styles.warning}>A complete fictional rule version is needed for this period.</p>}
      <p className={styles.context}>Period: {selectedPeriod?.code ?? "not selected"} · {sessions.length} draft session{sessions.length === 1 ? "" : "s"}</p>
      {sessions.map((session, index) => {
        const section = periodSections.find(s => s.id === session.sectionId);
        const teachers = initialCatalogue.teachers.filter(t => t.sectionId === session.sectionId);
        const roster = initialCatalogue.registrations.filter(r => r.periodId === periodId && r.courseCode === section?.courseCode);
        return <fieldset className={styles.session} key={session.id}><legend>Session {index + 1}</legend>
          <div className={styles.fields}>
            <label>Course section<select required value={session.sectionId} onChange={e => update(index, { sectionId: e.target.value, teacherAssignmentId: "", registrationIds: [] })}><option value="">Select section</option>{periodSections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.campusCode}</option>)}</select></label>
            <label>Venue<select required value={session.venueId} onChange={e => update(index, { venueId: e.target.value })}><option value="">Select room</option>{initialCatalogue.venues.map(v => <option key={v.id} value={v.id}>{v.code} · {v.teachingCapacity} seats</option>)}</select></label>
            <label>Lecturer appointment<select required value={session.teacherAssignmentId} onChange={e => update(index, { teacherAssignmentId: e.target.value })}><option value="">Select appointed lecturer</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
            <label>Starts<input type="datetime-local" required value={session.startLocal} onChange={e => update(index, { startLocal: e.target.value })} /></label>
            <label>Ends<input type="datetime-local" required value={session.endLocal} onChange={e => update(index, { endLocal: e.target.value })} /></label>
            <label>Planned seats<input type="number" min="1" max="500" required value={session.plannedSeats} onChange={e => update(index, { plannedSeats: Number(e.target.value) })} /></label>
          </div>
          <label className={styles.check}><input type="checkbox" checked={session.requiresStepFreeAccess} onChange={e => update(index, { requiresStepFreeAccess: e.target.checked })} />Step-free venue required for this activity</label>
          <div className={styles.roster}><strong>Registered learners linked to this section</strong>
            {roster.length ? roster.map(r => <label key={r.id}><input type="checkbox" checked={session.registrationIds.includes(r.id)} onChange={e => update(index, { registrationIds: e.target.checked ? [...session.registrationIds, r.id] : session.registrationIds.filter(id => id !== r.id) })} />{r.label}</label>) :
              <p>No official course registrations are available to map yet. This session will remain blocked for roster verification.</p>}</div>
          <button type="button" onClick={() => { changed(); setSessions(sessions.filter(s => s.id !== session.id)); }} disabled={sessions.length === 1 || pending}>Remove session</button>
        </fieldset>;
      })}
      <div className={styles.actions}><button className={styles.primary} type="submit" disabled={pending}>{pending ? "Saving draft…" : "Save and check conflicts"}</button><span aria-live="polite">{pending ? "Saving…" : message || (dirty ? "Changes not yet saved" : "")}</span></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
    <section className={styles.panel}><div className={styles.heading}><div><h2>Saved master preview</h2><p>Choose a version, then inspect the whole period or one course.</p></div>
      <button type="button" onClick={async () => { try { await reload(); setMessage("Latest history loaded."); } catch { setError("Could not reload history."); } }}>Reload history</button></div>
      <div className={styles.filters}><label>Master version<select value={selectedDraftId} onChange={e => { setSelectedDraftId(e.target.value); setCourse(""); setCoursePreview(null); }}><option value="">No draft yet</option>{history.map(d => <option key={d.id} value={d.id}>Version {d.version} · {initialCatalogue.periods.find(p => p.id === d.periodId)?.code ?? "period"} · {d.status === "BLOCKED" ? "blocked" : "for review"}</option>)}</select></label>
        <label>View<select value={course} onChange={e => void chooseCourse(e.target.value)} disabled={!selected}><option value="">Full master timetable</option>{[...new Set(selected?.sessions.map(s => s.courseCode) ?? [])].sort().map(code => <option key={code} value={code}>{code} course timetable</option>)}</select></label></div>
      {selected ? <><p className={styles.context}>Master version {selected.version} · {selected.status === "BLOCKED" ? "Blocked" : "Conflict-free for review only"} · checked {displayDate(selected.createdAt)}</p>
        <div className={styles.tableWrap}><table><thead><tr><th>Course / section</th><th>Starts</th><th>Ends</th><th>Venue</th><th>Seats</th><th>Reference</th></tr></thead><tbody>{displayed.map(s => <tr key={s.id}><td>{s.courseCode} · {s.sectionCode}</td><td>{displayDate(s.startAt)}</td><td>{displayDate(s.endAt)}</td><td>{s.venueCode}</td><td>{s.plannedSeats}</td><td>{s.id.slice(0, 8)}</td></tr>)}</tbody></table></div>
        <h3>Findings ({issues.length})</h3>{issues.length ? <ul className={styles.issues}>{issues.map((issue, i) => <li key={`${issue.code}-${i}`}><strong>{issueLabels[issue.code] ?? issue.code}</strong><span>{issue.occurrenceIds.length ? `Sessions ${issue.occurrenceIds.map(id => id.slice(0, 8)).join(" + ")}` : "Whole master timetable"}</span></li>)}</ul> : <p>No blocking findings in this saved snapshot. Approval and publication remain separate.</p>}
      </> : <p>No master draft has been saved yet.</p>}
    </section>
  </div>;
}
