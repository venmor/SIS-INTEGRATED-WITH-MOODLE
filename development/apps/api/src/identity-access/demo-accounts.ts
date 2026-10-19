import { createRequire } from 'node:module';
import { isDemonstrationDatabaseTarget } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { matchesSignInAudience } from './workspace.service.js';
const { verify } = createRequire(import.meta.url)('argon2') as typeof import('argon2');
// Only generated fictional fixtures. Never discover arbitrary database accounts.
export const DEMO_ACCOUNT_FIXTURES: readonly (readonly [string, string])[] = [
  [
    "mutinta.l",
    "Seed-2026-Mutinta"
  ],
  [
    "chanda.k",
    "Seed-2026-Chanda"
  ],
  [
    "bwalya.m",
    "Seed-2026-Bwalya"
  ],
  [
    "mweene.t",
    "Seed-2026-Mweene"
  ],
  [
    "temwani.r",
    "Seed-2026-Temwani"
  ],
  [
    "lubuto.s",
    "Seed-2026-Lubuto"
  ],
  [
    "kasonde.a",
    "Seed-2026-Kasonde"
  ],
  [
    "mwansa.k",
    "Seed-2026-Mwansa"
  ],
  [
    "daka.c",
    "Seed-2026-Daka"
  ],
  [
    "phiri.n",
    "Seed-2026-Phiri"
  ],
  [
    "mwila.t",
    "Seed-2026-Mwila"
  ],
  [
    "mumba.s",
    "Seed-2026-Mumba"
  ],
  [
    "kunda.b",
    "Seed-2026-Kunda"
  ],
  [
    "kabwe.f",
    "Seed-2026-Kabwe"
  ],
  [
    "mulenga.g",
    "Seed-2026-Mulenga"
  ],
  [
    "chisela.k",
    "Seed-2026-Chisela"
  ],
  [
    "kaluba.e",
    "Seed-2026-Kaluba"
  ],
  [
    "chisenga.l",
    "Seed-2026-Chisenga"
  ],
  [
    "mushota.m",
    "Seed-2026-Mushota"
  ],
  [
    "nasilele.scheduler",
    "Seed-2026-Scheduler"
  ],
  [
    "nasilele.master",
    "Seed-2026-Master"
  ],
  [
    "tembo.timetable",
    "Seed-2026-Timetable"
  ],
  [
    "chanda.time",
    "Seed-2026-Student"
  ],
  [
    "nalumino.setup",
    "Seed-2026-Setup"
  ],
  [
    "chileshe.policy",
    "Seed-2026-Policy"
  ],
  [
    "lombe.registration",
    "Review-2026-Lombe!"
  ],
  [
    "mwila.registration",
    "Review-2026-Mwila!"
  ],
  [
    "chanda.integration.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "lecturer.physics.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "moderator.physics.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "exams.prepare.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "exams.release.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "moodle.author.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "moodle.reviewer.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "academic.reviewer.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "moodle.operations.5bbb7c",
    "Review-2026-Moodle!"
  ],
  [
    "sis.demo.chanda.mulenga",
    "Presentation-2026-SIS!"
  ],
  [
    "sis.demo.bwalya.mwansa",
    "Presentation-2026-SIS!"
  ],
  [
    "sis.demo.mutale.banda",
    "Presentation-2026-SIS!"
  ],
  [
    "sis.demo.nasilele.tembo",
    "Presentation-2026-SIS!"
  ]
];
// These are the four accounts provisioned in the MoodleCloud presentation
// tenant. Moodle itself retains separate passwords; this list is used only to
// label the related SIS presentation cards.
const MOODLE_PRESENTATION_ACCOUNTS = [
  { username: 'sis.demo.chanda.mulenga', audience: 'student' as const, role: 'STUDENT', blurb: 'Moodle student: registration, course access and imported result.' },
  { username: 'sis.demo.bwalya.mwansa', audience: 'student' as const, role: 'STUDENT', blurb: 'Moodle student: course access and timetable demonstration.' },
  { username: 'sis.demo.mutale.banda', audience: 'student' as const, role: 'STUDENT', blurb: 'Moodle student: enrolled-course access demonstration.' },
  { username: 'sis.demo.nasilele.tembo', audience: 'staff' as const, role: 'LEC', blurb: 'Lecturer: Moodle course and grade-management demonstration.' },
] as const;
// Help presenters choose a workflow without implying that these labels grant
// access. The live appointment and account state still determine the workspace.
const DEMO_PURPOSE: Record<string, string> = {
  'bwalya.m': 'Applicant: start an application, add results and upload the required documents.',
  'chanda.time': 'Student: inspect a published timetable for the demonstration period.',
  'chanda.integration.5bbb7c': 'Student: inspect registration, Moodle course access and the result journey.',
  'lombe.registration': 'Student: complete a course-registration journey.',
  'mwila.registration': 'Student: inspect a registration outcome and course choices.',
  'nasilele.master': 'Timetable coordinator: prepare and preview the master timetable.',
  'tembo.timetable': 'Timetable reviewer: independently publish a prepared timetable.',
  'nasilele.scheduler': 'Scheduler: configure demonstration timetable rules.',
  'lecturer.physics.5bbb7c': 'Lecturer: review Moodle marks and stage a grade batch.',
  'moderator.physics.5bbb7c': 'Moderator: review staged marks independently.',
  'exams.prepare.5bbb7c': 'Examinations: prepare validated results for release.',
  'exams.release.5bbb7c': 'Examinations: independently review official result release.',
  'moodle.author.5bbb7c': 'Moodle administration: prepare course and account mappings.',
  'moodle.reviewer.5bbb7c': 'Moodle reviewer: inspect and approve connection changes.',
  'academic.reviewer.5bbb7c': 'Academic reviewer: inspect assessment decisions.',
  'moodle.operations.5bbb7c': 'Moodle operations: inspect sync, reconciliation and recovery.',
  'mumba.s': 'Staff: inspect assigned SIS workspaces and access reviews.',
};
export async function demoAccounts(prisma: PrismaService, env = process.env) {
  if (!isDemonstrationDatabaseTarget(env)) return { accounts: [] };
  const now = new Date();
  const accounts = await prisma.account.findMany({
    where: { username: { in: [...DEMO_ACCOUNT_FIXTURES.map(([username]) => username), ...MOODLE_PRESENTATION_ACCOUNTS.map(({ username }) => username)] }, status: 'ACTIVE',
      person: { status: 'ACTIVE', duplicateOfPersonId: null },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
    select: { username: true, roles: { where: { revokedAt: null, startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }], scopeType: { not: 'BREAK_GLASS' } },
      select: { role: true } }, credentials: { where: { kind: 'PASSWORD', status: 'ACTIVE' }, select: { secretHash: true } } },
  });
  const result = [];
  for (const [username, password] of DEMO_ACCOUNT_FIXTURES) {
    const account = accounts.find((row) => row.username === username);
    if (!account || !account.roles.length || !account.credentials[0] ||
      !await verify(account.credentials[0].secretHash, password).catch(() => false)) continue;
    for (const audience of ['student', 'staff'] as const) {
      const roles = account.roles.filter(({ role }) => matchesSignInAudience(role, audience));
      if (roles.length) result.push({ username, password, audience, role: roles.map(({role}) => role).join(' / '),
        blurb: DEMO_PURPOSE[username] ?? 'Fictional demonstration account. Enter fictional information only.', canFill: true });
    }
  }
  for (const presentation of MOODLE_PRESENTATION_ACCOUNTS) {
    if (result.some((account) => account.username === presentation.username)) continue;
    const account = accounts.find((row) => row.username === presentation.username);
    if (!account || !account.credentials.length || !account.roles.some(({ role }) => role === presentation.role)) continue;
    result.push({ ...presentation, password: null, canFill: false,
      credentialHint: 'Use the Moodle presentation password supplied separately for this account.' });
  }
  return { accounts: result };
}
