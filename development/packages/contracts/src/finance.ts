/** Phase 5 slice 1: fee assessment views (TASK-PH5-001). Money travels as
 * integer minor units + currency; components format, never calculate. */
export interface ChargeLineView {
  id: string;
  code: string;
  description: string;
  courseCode: string | null;
  courseTitle: string | null;
  amountMinor: number;
  currency: string;
  feeRule: string;
  policyVersion: string;
  status: string;
}
export interface InvoiceView {
  id: string;
  reference: string;
  period: string;
  policyVersion: string;
  status: string;
  dueAt: string | null;
  lines: ChargeLineView[];
  totalMinor: number;
  currency: string;
  assessedAt: string;
}
/** Phase 5 slice 2: account and statement views (TASK-PH5-002). Balances
 * derive from posted lines; no stored balance column exists anywhere. */
export interface FinanceAccountView {
  studentNumber: string;
  period: string;
  clearanceStatus: string;
  clearanceWording: string;
  outstandingMinor: number;
  currency: string;
  blocksRegistration: boolean;
  nextAction: string;
  dueAt: string | null;
  sponsorship: string;
  refreshedAt: string;
  supportRoute: string;
}
export interface StatementLineView {
  id: string;
  kind: string;
  description: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
}
export interface StatementView {
  reference: string;
  period: string;
  lines: StatementLineView[];
  payments: unknown[];
  allocations: unknown[];
  invoicedMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  currency: string;
}
/** Phase 5 slice 6: finance workspace views (TASK-PH5-006). Students
 * receive safe wording only; officers see evidence and authority. */
export interface ReconCaseView {
  id: string;
  kind: string;
  status: string;
  providerRef: string | null;
  createdAt: string;
  resolvedAt: string | null;
  studentNumber: string | null;
  safeMessage: string;
}
export interface ReconCaseDetailView extends ReconCaseView {
  detail: unknown;
  callbacks: Array<{ status: string; receivedAt: string }>;
  allocations: Array<{ chargeCode: string; amountMinor: number }>;
}
export interface SponsorshipView {
  id: string;
  sponsorName: string;
  status: string;
  version?: number;
  coverage?: string;
}
export interface AdjustmentView {
  id: string;
  kind: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: string;
}
export interface ArrangementView {
  id: string;
  terms: string;
  reason?: string;
  status: string;
  expiresAt: string | null;
}
