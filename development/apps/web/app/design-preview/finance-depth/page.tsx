import { FutureWorkspace } from "../future-workspace";

export default function FinanceDepthPreview() {
  return <FutureWorkspace
    context="Finance depth · future v1.x"
    title="Refunds, reversals and sponsorship reporting"
    maturity="Preview — planned v1.x"
    summary="Future finance operations beyond the live Phase-5/6 account, payment and reconciliation surfaces."
    queue={[
      { title: "Refund RF-2026-014", meta: "Overpayment evidence attached; maker completed review", state: "Second approver required" },
      { title: "Reversal RV-2026-008", meta: "Provider reversal would re-open clearance assessment", state: "Impact review" },
    ]}
    facts={[
      { label: "Account", value: "STU-DEMO-0201 · 2026S1" },
      { label: "Refund authority", value: "Maker/checker; second approver required" },
      { label: "Reversal treatment", value: "Compensating event; original transaction retained" },
      { label: "Reporting basis", value: "Posted finance ledger + approved sponsorship records" },
    ]}
    authority="Refunds and reversals never erase payment history. Approval separation remains explicit and clearance is recalculated from governed ledger effects."
    recovery="If provider evidence and SIS ledger state disagree, open reconciliation work and stop automatic payout or reversal processing until the mismatch is resolved."
  />;
}
