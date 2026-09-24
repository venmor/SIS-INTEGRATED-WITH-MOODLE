import { FutureWorkspace } from "../future-workspace";

export default function StudentDepthPreview() {
  return <FutureWorkspace
    context="Student depth · future v1.x"
    title="Programme progression"
    maturity="Preview — planned v1.x"
    summary="A student-facing continuation for add/drop, progression and transcript-basis states after the live Phase-6 registration journey."
    queue={[
      { title: "SWE221 add request", meta: "Requested after timetable review", state: "Awaiting faculty" },
      { title: "CSC214 drop request", meta: "Financial and progression effects must be recalculated", state: "Needs review" },
    ]}
    facts={[
      { label: "Student", value: "STU-DEMO-0201" },
      { label: "Current level", value: "Level 2" },
      { label: "Progression basis", value: "Published curriculum + official results only" },
      { label: "Transcript basis", value: "Published official attempts; provisional marks excluded" },
    ]}
    authority="Course changes remain governed requests. Progression is derived from approved curriculum and published official results, not from Moodle activity."
    recovery="If a prerequisite, timetable or finance dependency is unknown, keep the request pending and identify the owning office instead of guessing eligibility."
  />;
}
