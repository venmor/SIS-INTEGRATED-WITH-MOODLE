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
  ]
];
export async function demoAccounts(prisma: PrismaService, env = process.env) {
  if (!isDemonstrationDatabaseTarget(env)) return { accounts: [] };
  const now = new Date();
  const accounts = await prisma.account.findMany({
    where: { username: { in: DEMO_ACCOUNT_FIXTURES.map(([username]) => username) }, status: 'ACTIVE',
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
        blurb: 'Fictional demonstration account. Enter fictional information only.' });
    }
  }
  return { accounts: result };
}
