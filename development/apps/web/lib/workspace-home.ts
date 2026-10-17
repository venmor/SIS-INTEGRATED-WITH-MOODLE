export interface LandingWorkspace {
  role: string;
  scopeType: string;
  scopeRef: string;
  endsAt?: string | null;
}

export interface LandingAccess {
  setupAvailable?: boolean;
  demoRulesAvailable?: boolean;
  timetable?: { canRead: boolean; canCreate?: boolean; canPublish?: boolean } | null;
}

/** Navigation only; each destination rechecks live server authority. */
export function workspaceHome(
  active: LandingWorkspace | null,
  access: LandingAccess = {},
): string {
  if (!active || !active.scopeType || !active.scopeRef || active.scopeType === 'BREAK_GLASS')
    return '/workspaces';
  if (active.endsAt && (!Number.isFinite(Date.parse(active.endsAt)) || Date.parse(active.endsAt) <= Date.now()))
    return '/workspaces';
  if (active.role === 'SYSADMIN')
    return active.scopeType === 'SYSTEM' && active.scopeRef === 'GLOBAL'
      ? '/admin/reviews' : '/workspaces';
  if (active.role === 'DOMAIN_ADMIN' || active.role === 'TIMETABLE_COORDINATOR') {
    if (active.scopeType === 'SYSTEM' && active.scopeRef === 'DEMO-UNIVERSITY') {
      if (access.timetable?.canRead) {
        if (active.role === 'TIMETABLE_COORDINATOR' && access.timetable.canCreate)
          return '/admin/timetabling/master';
        return '/admin/timetabling/publications';
      }
      if (active.role === 'DOMAIN_ADMIN' && access.setupAvailable)
        return '/admin/setup/university';
    }
    if (active.role === 'DOMAIN_ADMIN' && active.scopeType === 'CAMPUS' &&
      active.scopeRef.startsWith('DEMO-') && access.demoRulesAvailable)
      return '/admin/timetabling/demo-rules';
    return '/workspaces';
  }
  const homes: Record<string, string> = {
    APP: '/applicant', APPLICANT: '/applicant',
    STU: '/student', STUDENT: '/student',
    LEC: '/admin/assessment/plans',
    COORDINATOR: '/admin/teaching/groups',
    EXAMINATIONS_OFFICER: '/admin/assessment/publications',
    MODERATOR: '/admin/assessment/moderation',
    ADMISSIONS_OFFICER: '/admin/admissions/queue',
    ADMISSIONS_APPROVER: '/admin/admissions/queue',
    RECORDS_OFFICER: '/admin/records/duplicates',
    FINANCE_OFFICER: '/admin/finance', FINANCE_APPROVER: '/admin/finance',
    CASHIER: '/admin/finance/cashier',
    MOODLE_ADMIN: '/admin/moodle',
    INTEGRATION_SUPPORT: '/admin/integration',
    ADVISER: '/admin/support',
  };
  return homes[active.role] ?? '/workspaces';
}
