import { FutureWorkspace } from "../future-workspace";

export default function ReportingPreview() {
  return <FutureWorkspace
    context="Certified reporting · V2 operational completion"
    title="Certified report packages"
    maturity="Operational completion target — v2.0"
    summary="Future governed reporting with privacy suppression, reproducible package definitions and authorised signatory release."
    queue={[
      { title: "REG-ENROL-2026Q3", meta: "Population frozen; disclosure review pending", state: "Privacy review" },
      { title: "AWARD-2026-02", meta: "Package generated; signature authority not yet applied", state: "Awaiting signatory" },
    ]}
    facts={[
      { label: "Package definition", value: "Versioned population, filters and generated-at time" },
      { label: "Privacy suppression", value: "Small-cell and restricted-field rules applied before release" },
      { label: "Release authority", value: "Authorised signatory required" },
      { label: "Reproduction", value: "Package definition and source snapshot reference retained" },
    ]}
    authority="A generated report is not certified until privacy suppression passes and an authorised signatory releases the package."
    recovery="If suppression rules or source freshness checks fail, block release, retain the package definition and regenerate from corrected authoritative data."
  />;
}
