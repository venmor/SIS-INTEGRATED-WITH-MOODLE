import { Injectable } from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { auditAuth } from './audit.js';
import { evaluatePolicy } from './policy.service.js';
import { hashToken } from './session.service.js';

// Live assignment views (REQ-IAM-002/003). Expired or revoked rows are never
// workspaces: filtered here, never trusted from the client.
export interface WorkspaceView {
  assignmentId: string;
  role: string;
  scopeType: string;
  scopeRef: string;
  startsAt: string;
  endsAt: string | null;
  employmentType: string | null;
}

interface AssignmentRow {
  id: string;
  accountId: string;
  role: string;
  scopeType: string;
  scopeRef: string;
  startsAt: Date;
  endsAt: Date | null;
  revokedAt: Date | null;
  employmentType: string | null;
}

function isLive(row: AssignmentRow, now: number): boolean {
  return !row.revokedAt && row.startsAt.getTime() <= now && (!row.endsAt || row.endsAt.getTime() > now);
}

function toView(row: AssignmentRow): WorkspaceView {
  return {
    assignmentId: row.id,
    role: row.role,
    scopeType: row.scopeType,
    scopeRef: row.scopeRef,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    employmentType: row.employmentType,
  };
}

function scopeOf(row: AssignmentRow): string {
  return `${row.scopeType}:${row.scopeRef}`;
}

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Live workspaces, earliest-started first (deterministic order). */
  async liveWorkspaces(accountId: string, now = Date.now()): Promise<WorkspaceView[]> {
    const rows = await this.prisma.roleAssignment.findMany({
      where: { accountId },
      orderBy: { startsAt: 'asc' },
    });
    return rows.filter((row) => isLive(row, now)).map(toView);
  }

  /** Sign-in default: earliest-started live assignment (demo-deterministic). */
  async defaultWorkspace(accountId: string): Promise<WorkspaceView | null> {
    const list = await this.liveWorkspaces(accountId);
    return list[0] ?? null;
  }

  /** Resolve a session's active assignment; null when dead or never chosen. */
  async resolveActive(accountId: string, assignmentId: string | null): Promise<WorkspaceView | null> {
    if (!assignmentId) return null;
    const row = await this.prisma.roleAssignment.findUnique({ where: { id: assignmentId } });
    if (!row || row.accountId !== accountId || !isLive(row, Date.now())) return null;
    return toView(row);
  }

  async switchWorkspace(sessionToken: string, assignmentId: string) {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(sessionToken) } });
    if (!session || session.revokedAt) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SwitchWorkspace',
        outcome: 'DENY',
        targetRef: assignmentId,
        reason: 'invalid-session',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false as const, message: AUTH_MESSAGES.grantDenied.text, reference: correlationId };
    }
    // §15.21 central decision before touching the target (verb, SoD).
    // Ownership + liveness of the target stay service-side below.
    const actorRoles = (await this.liveWorkspaces(session.accountId)).map((w) => w.role);
    const current = await this.resolveActive(session.accountId, session.activeAssignmentId);
    const decision = evaluatePolicy({
      action: 'iam.workspace.switch',
      activeRole: current?.role ?? actorRoles[0] ?? null,
      scope: current ? `${current.scopeType}:${current.scopeRef}` : null,
      assignmentLive: true,
      actorRoles,
    });
    if (!decision.allow) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SwitchWorkspace',
        outcome: 'DENY',
        actorAccountId: session.accountId,
        targetRef: assignmentId,
        reason: decision.reason ?? 'policy-denied',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false as const, message: AUTH_MESSAGES.grantDenied.text, reference: correlationId };
    }
    const row = await this.prisma.roleAssignment.findUnique({ where: { id: assignmentId } });
    if (!row || row.accountId !== session.accountId || !isLive(row, Date.now())) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SwitchWorkspace',
        outcome: 'DENY',
        actorAccountId: session.accountId,
        targetRef: assignmentId,
        reason: 'invalid-or-inactive-workspace',
        errorCategory: 'ERR-SEC',
      });
      // §12.12 verbatim: the assignment changed under a live session, so the
      // action cannot complete. Drafts stay in the owning (uncontrolled) form.
      return { ok: false as const, message: AUTH_MESSAGES.assignmentChanged.text, reference: correlationId };
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { activeAssignmentId: row.id, lastSeenAt: new Date() },
    });
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-SwitchWorkspace',
      outcome: 'ALLOW',
      actorAccountId: session.accountId,
      activeRole: row.role,
      scope: scopeOf(row),
      targetRef: row.id,
      reason: 'workspace-switched',
      purpose: 'workspace-switch',
    });
    const workspace = toView(row);
    return {
      ok: true as const,
      workspace: {
        assignmentId: workspace.assignmentId,
        role: workspace.role,
        scopeType: workspace.scopeType,
        scopeRef: workspace.scopeRef,
      },
      message: AUTH_MESSAGES.workspaceSwitched.text,
      reference: correlationId,
    };
  }
}
