import { FutureWorkspace } from "../future-workspace";

export default function SupportPreview() {
  return <FutureWorkspace
    context="Student support · future v1.x"
    title="Advising and support requests"
    maturity="Preview — planned v1.x"
    summary="A privacy-aware support workspace for routing student help without turning sensitive notes into general SIS profile data."
    queue={[
      { title: "Support request SR-0208", meta: "Registration difficulty; academic adviser owns next step", state: "Assigned" },
      { title: "Support request SR-0211", meta: "Sensitive wellbeing topic", state: "Restricted" },
    ]}
    facts={[
      { label: "Student-facing subject", value: "Registration support" },
      { label: "General case visibility", value: "Status, owner and safe summary only" },
      { label: "Restricted support notes", value: "Need-to-know support team access only" },
      { label: "Disclosure rule", value: "No sensitive note text in academic or finance queues" },
    ]}
    authority="Restricted support notes stay outside the general case view and follow a need-to-know privacy boundary."
    recovery="If a request contains sensitive information outside the current user's authority, preserve the safe case status and route the restricted content to the owning support role."
  />;
}
