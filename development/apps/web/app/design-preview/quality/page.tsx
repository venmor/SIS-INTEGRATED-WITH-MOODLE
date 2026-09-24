import { FutureWorkspace } from "../future-workspace";

export default function QualityPreview() {
  return <FutureWorkspace
    context="Quality assurance · future v1.x"
    title="Programme review evidence"
    maturity="Preview — planned v1.x"
    summary="Future review cycles for evidence, findings, action ownership and closure proof."
    queue={[
      { title: "SWE annual review 2026", meta: "Two findings still need named owners", state: "Action required" },
      { title: "Assessment moderation evidence", meta: "Evidence uploaded; closure decision outstanding", state: "Under review" },
    ]}
    facts={[
      { label: "Review cycle", value: "SWE · 2026 annual review" },
      { label: "Finding owner", value: "School Quality Lead" },
      { label: "Closure rule", value: "Evidence + accountable owner + reviewer decision" },
      { label: "Audit history", value: "Finding and response history retained" },
    ]}
    authority="Quality reviewers record findings and verify closure evidence; operational teams own corrective actions and cannot silently close their own findings."
    recovery="If evidence is missing or ownership is unclear, keep the finding open and name the missing proof or responsible office."
  />;
}
