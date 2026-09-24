import { FutureWorkspace } from "../future-workspace";

export default function GraduationPreview() {
  return <FutureWorkspace
    context="Graduation · V2 operational completion"
    title="Award readiness and verification"
    maturity="Operational completion target — v2.0"
    summary="Future award-readiness orchestration built from authoritative academic, finance and identity records."
    queue={[
      { title: "STU-DEMO-0201", meta: "Academic completion met; finance verification pending", state: "One dependency" },
      { title: "STU-DEMO-0224", meta: "Name verification requires Records review", state: "Records action" },
    ]}
    facts={[
      { label: "Award", value: "BSc Software Engineering" },
      { label: "Academic basis", value: "Published official results and approved curriculum" },
      { label: "Identity basis", value: "Verified student record" },
      { label: "Integrity rule", value: "Source records remain authoritative; graduation does not rewrite them" },
    ]}
    authority="Graduation readiness aggregates evidence. Source records remain authoritative and corrections happen in the owning academic, finance or records domain."
    recovery="When a dependency is stale or disputed, mark readiness unknown and send the correction to the source-owning office before award approval."
  />;
}
