import { validate } from 'class-validator';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import type {
  ActiveWorkspace,
  GrantRoleBody,
  MeResponse,
  SwitchWorkspaceBody,
  WorkspaceAssignment,
} from '@sis/contracts';
import { GrantRoleDto, SwitchWorkspaceDto } from './dto.js';
import { RateLimiter } from './rate-limit.js';

// Slice-3 contract proofs (TDD RED first): demo rate limits, message
// templates, and DTO↔canonical-contract compatibility for workspace switch
// and role grants. Canonical shapes live in @sis/contracts; validation lives
// in local DTOs, once.
function consumesSwitch(body: SwitchWorkspaceBody): string {
  return body.assignmentId;
}
function consumesGrant(body: GrantRoleBody): string {
  return body.username;
}

describe('workspace contract compatibility', () => {
  it('exposes demo grant/switch rate limits from SECURITY-v1', () => {
    expect(SECURITY_V1.rateLimits.grant).toEqual({
      maxAttempts: 20,
      windowMinutes: 60,
    });
    expect(SECURITY_V1.rateLimits.workspaceSwitch).toEqual({
      maxAttempts: 30,
      windowMinutes: 15,
    });
    expect(SECURITY_V1.rateLimits.grantResolve).toEqual({
      maxAttempts: 30,
      windowMinutes: 15,
    });
    expect(RateLimiter.grantLimit().maxAttempts).toBe(20);
    expect(RateLimiter.workspaceSwitchLimit().maxAttempts).toBe(30);
    expect(RateLimiter.grantResolveLimit().maxAttempts).toBe(30);
  });

  it('exposes workspace message templates with stable IDs', () => {
    const templates = AUTH_MESSAGES as unknown as Record<
      string,
      { id: string; text: string } | undefined
    >;
    expect(templates.workspaceSwitched).toBeDefined();
    expect(templates.workspaceSwitched?.id).toBe('WORKSPACE-001');
    expect(AUTH_MESSAGES.grantCreated.id).toBe('WORKSPACE-002');
    expect(AUTH_MESSAGES.grantDenied.id).toBe('WORKSPACE-003');
    expect(AUTH_MESSAGES.workspaceSwitched.text).toContain(
      'Workspace switched',
    );
    expect(templates.scopedEmpty?.id).toBe('WORKSPACE-004');
    expect(templates.scopedEmpty?.text).toBe(
      'There are no records available in your current role and scope.',
    );
  });

  it('DTO shapes satisfy canonical contracts', () => {
    expect(SwitchWorkspaceDto).toBeDefined();
    expect(GrantRoleDto).toBeDefined();
    const sw = new SwitchWorkspaceDto();
    sw.assignmentId = '123e4567-e89b-12d3-a456-426614174000';
    expect(consumesSwitch(sw)).toBe(sw.assignmentId);
    const grant = new GrantRoleDto();
    grant.username = 'mutinta.l';
    grant.role = 'TUT';
    grant.scopeType = 'OFFERING';
    grant.scopeRef = 'SWE101-2026S1';
    grant.startsAt = '2026-03-01';
    grant.appointmentRef = 'HR-2026-099';
    grant.authoritySource = 'University Appointments';
    grant.reason = 'Tutorial cover';
    expect(consumesGrant(grant)).toBe('mutinta.l');
    const ws: WorkspaceAssignment = {
      assignmentId: 'a',
      role: 'LEC',
      scopeType: 'OFFERING',
      scopeRef: 'SWE101-2026S1',
      startsAt: '2026-01-15',
      endsAt: null,
      employmentType: 'PERMANENT',
    };
    const active: ActiveWorkspace = {
      assignmentId: 'a',
      role: 'LEC',
      scopeType: 'OFFERING',
      scopeRef: 'SWE101-2026S1',
      endsAt: null,
    };
    const me: MeResponse = {
      account: {
        accountId: 'a',
        personId: 'p',
        username: 'u',
        displayName: 'n',
      },
      workspaces: [ws],
      activeWorkspace: active,
    };
    expect(me.workspaces).toHaveLength(1);
  });

  it('rejects a non-UUID assignment id', async () => {
    expect(SwitchWorkspaceDto).toBeDefined();
    const dto = new SwitchWorkspaceDto();
    dto.assignmentId = 'not-a-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('requires grant evidence fields per §12.9', async () => {
    expect(GrantRoleDto).toBeDefined();
    const dto = new GrantRoleDto();
    dto.username = 'mutinta.l';
    dto.role = 'TUT';
    dto.scopeType = 'OFFERING';
    dto.scopeRef = 'SWE101-2026S1';
    dto.startsAt = '2026-03-01';
    dto.reason = 'Tutorial cover';
    const errors = await validate(dto);
    const props = errors.map((e) => e.property);
    expect(props).toContain('appointmentRef');
    expect(props).toContain('authoritySource');
  });
});
