import { FutureWorkspace } from "../future-workspace";

export default function IntegrationsPreview() {
  return <FutureWorkspace
    context="Production integrations · V2 operational completion"
    title="Provider operations and credential rotation"
    maturity="Operational completion target — v2.0"
    summary="Future production-provider operations that extend the live simulator-backed integration model without exposing secrets."
    queue={[
      { title: "Moodle production endpoint", meta: "Health check passed; certificate review due in 12 days", state: "Healthy" },
      { title: "Credential rotation CR-004", meta: "New credential staged in secret store; cutover approval pending", state: "Awaiting approval" },
    ]}
    facts={[
      { label: "Provider", value: "Moodle production" },
      { label: "Credential display", value: "Never rendered; secret-store reference only" },
      { label: "Credential rotation", value: "Stage, validate, approve, cut over, revoke old reference" },
      { label: "Health evidence", value: "Version, endpoint reachability and last successful delivery" },
    ]}
    authority="Operators can see health and credential lifecycle state, but production integration secrets never render in SIS pages, audit metadata or support exports."
    recovery="If a rotation or provider cutover fails, keep the last known-good credential active, record the failed checkpoint and recover through an approved rollback."
  />;
}
