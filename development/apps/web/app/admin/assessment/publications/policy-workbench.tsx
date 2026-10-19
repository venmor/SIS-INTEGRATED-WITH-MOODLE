"use client";
import { useRef, useState } from "react";
import { Notice } from "@sis/ui";
import staffUi from "../../staff-workspace.module.css";
type Policy = { id: string; offeringRef: string; periodCode: string; releaseAt: string; showMarks: boolean; reviewInstructions: string; approvedAt: string | null; version: string };
export function ResultPolicyWorkbench({ periods }: { periods: string[] }) {
  const draftRequest = useRef<{ payload: string; key: string } | null>(null);
  const [period, setPeriod] = useState(periods[0] ?? "");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function run(path: string, body?: object) {
    setPending(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/assessment/result-publication/${path}`, {
        method: body ? "POST" : "GET", cache: "no-store", credentials: "same-origin",
        headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
        body: body ? JSON.stringify(path === "demo-policies" ? (() => {
          const payload = JSON.stringify(body);
          if (!draftRequest.current || draftRequest.current.payload !== payload) draftRequest.current = { payload, key: crypto.randomUUID() };
          return { ...body, idempotencyKey: draftRequest.current.key };
        })() : body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "The release policy could not be confirmed.");
      if (Array.isArray(data)) setPolicies(data); else {
        setPolicies((rows) => [data, ...rows.filter((row) => row.id !== data.id)]);
        setMessage(data.approvedAt ? "Release policy approved. The reviewed batch can now use this policy." : "Draft saved. A different examinations officer must approve it.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Check the policy list before retrying."); }
    finally { setPending(false); }
  }
  return <details className={staffUi.panel}>
    <summary>Release policy setup</summary>
    <p>Configure the course, release time and student guidance for this demonstration. A different examinations officer approves each immutable draft. Institutional policy approval remains separate.</p>
    {error ? <Notice severity="warning" title="Policy not confirmed" message={error} /> : null}
    {message ? <Notice severity="success" title="Release policy" message={message} /> : null}
    <form className={staffUi.form} aria-label="Create demonstration release policy" onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      const release = String(data.get("releaseAt"));
      void run("demo-policies", { offeringRef: data.get("offeringRef"), periodCode: period, releaseAt: new Date(`${release}:00+02:00`).toISOString(), showMarks: data.get("showMarks") === "on", reviewInstructions: data.get("reviewInstructions") });
    }}>
      <fieldset disabled={pending}>
        <legend>New course release policy</legend>
        <label className={staffUi.fieldLabel} htmlFor="policy-period">Academic period</label>
        <input className={staffUi.control} id="policy-period" required maxLength={100} list="policy-periods" value={period} onChange={(event) => setPeriod(event.target.value)} />
        <datalist id="policy-periods">{periods.map((value) => <option key={value} value={value} />)}</datalist>
        <label className={staffUi.fieldLabel} htmlFor="policy-course">Course code</label>
        <input className={staffUi.control} id="policy-course" name="offeringRef" required maxLength={100} placeholder="e.g. CSC 1100" />
        <label className={staffUi.fieldLabel} htmlFor="policy-release">Release from (CAT)</label>
        <input className={staffUi.control} id="policy-release" name="releaseAt" type="datetime-local" required />
        <label className={staffUi.fieldLabel} htmlFor="policy-guidance">Student review instructions</label>
        <textarea className={staffUi.control} id="policy-guidance" name="reviewInstructions" required maxLength={500} defaultValue="Contact the examinations office through Requests and support to request a result review." />
        <label><input name="showMarks" type="checkbox" defaultChecked /> Show the approved numeric mark</label>
        <p><button className={staffUi.button} type="submit">{pending ? "Saving…" : "Save policy draft"}</button>{" "}<button className={staffUi.button} type="button" disabled={!period || pending} onClick={() => void run(`demo-policies?periodCode=${encodeURIComponent(period)}`)}>Load period policies</button></p>
      </fieldset>
    </form>
    {policies.length ? <div className={staffUi.tableScroll}><table className={staffUi.table}><caption>Release policy versions</caption><thead><tr><th>Course and period</th><th>Release time (CAT)</th><th>Student view</th><th>Decision</th></tr></thead><tbody>{policies.map((policy) => <tr key={policy.id}><td>{policy.offeringRef}<br />{policy.periodCode}</td><td>{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lusaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(policy.releaseAt))}</td><td>{policy.showMarks ? "Mark and outcome" : "Outcome only"}<br />{policy.reviewInstructions}</td><td>{policy.approvedAt ? "Approved" : <button className={staffUi.button} disabled={pending} onClick={() => void run(`demo-policies/${policy.id}/approve`, {})}>Approve policy</button>}</td></tr>)}</tbody></table></div> : <p>Load the selected period to review saved policies.</p>}
  </details>;
}
