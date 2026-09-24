import { FutureWorkspace } from "../future-workspace";

export default function TeachingDepthPreview() {
  return <FutureWorkspace
    context="Teaching depth · future v1.x"
    title="Teaching calendar and grade mapping"
    maturity="Preview — planned v1.x"
    summary="Future lecturer coordination for assessment calendars and explicit SIS-to-Moodle grade mappings."
    queue={[
      { title: "SWE111 Quiz 2 mapping", meta: "Moodle activity found; SIS assessment component not yet approved", state: "Unmapped" },
      { title: "Tutorial calendar change", meta: "Affects TG-B only", state: "Awaiting coordinator" },
    ]}
    facts={[
      { label: "Offering", value: "SWE111 · 2026S1" },
      { label: "Teaching scope", value: "Assigned offering and tutorial groups only" },
      { label: "Grade source", value: "Moodle provisional evidence" },
      { label: "Official result", value: "SIS publication authority remains separate" },
    ]}
    authority="Lecturers may prepare teaching and provisional assessment evidence inside assigned scope; they do not publish official academic results."
    recovery="If an activity cannot be mapped safely, leave it unmapped and route it to the course coordinator rather than importing marks into the wrong component."
  />;
}
