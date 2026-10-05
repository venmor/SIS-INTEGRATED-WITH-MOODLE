import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { SECURITY_V1 } from '@sis/config';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { toPlanningRules } from './demo-rules-policy.js';

interface TravelRow {
  fromCampus: string;
  toCampus: string;
  minutes: number;
}

interface DraftCommand {
  clientRequestId: string;
  expectedVersion: number;
  periodId: string;
  teachingStartDate: string;
  teachingEndDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  allowedWeekdays: number[];
  maxSessionMinutes: number;
  roomTurnaroundMinutes: number;
  maxOccurrences: number;
  travel: TravelRow[];
}

const campusCode = /^DEMO-[A-Z0-9-]{1,30}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const timeOnly = /^([01]\d|2[0-3]):[0-5]\d$/;
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !dateOnly.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function timetableDemoDraftsEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (
    env.DEMO_MODE !== 'true' ||
    env.SIS_ENABLE_TIMETABLE_DEMO_DRAFTS !== 'true'
  ) return false;
  try {
    const url = new URL(env.DATABASE_URL ?? '');
    return (
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      /(?:test|review|ci)/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function parseDraftCommand(input: unknown): DraftCommand {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Enter the fictional timetable rules.');
  const value = input as Record<string, unknown>;
  const allowed = new Set([
    'clientRequestId',
    'expectedVersion',
    'periodId',
    'teachingStartDate',
    'teachingEndDate',
    'dailyStartTime',
    'dailyEndTime',
    'allowedWeekdays',
    'maxSessionMinutes',
    'roomTurnaroundMinutes',
    'maxOccurrences',
    'travel',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key)))
    throw new BadRequestException('Unsupported rule field.');
  if (typeof value.clientRequestId !== 'string' || !uuid.test(value.clientRequestId))
    throw new BadRequestException('A valid save reference is required.');
  if (!Number.isSafeInteger(value.expectedVersion) || (value.expectedVersion as number) < 0)
    throw new BadRequestException('Reload the latest rule version.');
  if (typeof value.periodId !== 'string' || !uuid.test(value.periodId))
    throw new BadRequestException('Select a configured academic period.');
  if (!validDate(value.teachingStartDate) || !validDate(value.teachingEndDate) || value.teachingStartDate > value.teachingEndDate)
    throw new BadRequestException('Enter valid, ordered teaching dates.');
  if (Date.parse(`${value.teachingEndDate}T00:00:00Z`) - Date.parse(`${value.teachingStartDate}T00:00:00Z`) > 366 * 86_400_000)
    throw new BadRequestException('One fictional teaching window may span at most 367 inclusive days.');
  if (typeof value.dailyStartTime !== 'string' || typeof value.dailyEndTime !== 'string' || !timeOnly.test(value.dailyStartTime) || !timeOnly.test(value.dailyEndTime) || value.dailyStartTime >= value.dailyEndTime)
    throw new BadRequestException('Enter valid, ordered daily teaching hours.');
  if (!Array.isArray(value.allowedWeekdays) || value.allowedWeekdays.length === 0 || value.allowedWeekdays.length > 7 ||
    value.allowedWeekdays.some((day) => !Number.isSafeInteger(day) || day < 1 || day > 7) ||
    new Set(value.allowedWeekdays).size !== value.allowedWeekdays.length)
    throw new BadRequestException('Choose one or more distinct teaching weekdays.');
  if (!Number.isSafeInteger(value.maxSessionMinutes) || (value.maxSessionMinutes as number) < 15 || (value.maxSessionMinutes as number) > 480)
    throw new BadRequestException('Maximum session duration must be 15–480 minutes.');
  const clockMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  if ((value.maxSessionMinutes as number) > clockMinutes(value.dailyEndTime) - clockMinutes(value.dailyStartTime))
    throw new BadRequestException('Maximum session duration cannot exceed the daily teaching hours.');
  if (
    !Number.isSafeInteger(value.roomTurnaroundMinutes) ||
    (value.roomTurnaroundMinutes as number) < 0 ||
    (value.roomTurnaroundMinutes as number) > 120
  ) throw new BadRequestException('Room turnaround must be 0–120 minutes.');
  if (
    !Number.isSafeInteger(value.maxOccurrences) ||
    (value.maxOccurrences as number) < 1 ||
    (value.maxOccurrences as number) > 500
  ) throw new BadRequestException('Draft size must be 1–500 sessions.');
  if (!Array.isArray(value.travel) || value.travel.length > 50)
    throw new BadRequestException('Enter up to 50 campus travel rules.');
  const seen = new Set<string>();
  const travel = value.travel.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new BadRequestException('Check each campus travel rule.');
    const row = raw as Record<string, unknown>;
    if (
      Object.keys(row).some((key) => !['fromCampus', 'toCampus', 'minutes'].includes(key)) ||
      typeof row.fromCampus !== 'string' ||
      typeof row.toCampus !== 'string' ||
      !campusCode.test(row.fromCampus) ||
      !campusCode.test(row.toCampus) ||
      row.fromCampus === row.toCampus ||
      !Number.isSafeInteger(row.minutes) ||
      (row.minutes as number) < 0 ||
      (row.minutes as number) > 240
    ) throw new BadRequestException('Check each campus travel rule.');
    const key = `${row.fromCampus}\0${row.toCampus}`;
    if (seen.has(key)) throw new BadRequestException('A campus travel route is repeated.');
    seen.add(key);
    return {
      fromCampus: row.fromCampus,
      toCampus: row.toCampus,
      minutes: row.minutes as number,
    };
  });
  travel.sort((a, b) =>
    a.fromCampus.localeCompare(b.fromCampus) ||
    a.toCampus.localeCompare(b.toCampus),
  );
  return {
    clientRequestId: value.clientRequestId,
    expectedVersion: value.expectedVersion as number,
    periodId: value.periodId,
    teachingStartDate: value.teachingStartDate,
    teachingEndDate: value.teachingEndDate,
    dailyStartTime: value.dailyStartTime,
    dailyEndTime: value.dailyEndTime,
    allowedWeekdays: [...(value.allowedWeekdays as number[])].sort((a, b) => a - b),
    maxSessionMinutes: value.maxSessionMinutes as number,
    roomTurnaroundMinutes: value.roomTurnaroundMinutes as number,
    maxOccurrences: value.maxOccurrences as number,
    travel,
  };
}

@Injectable()
export class DemoTimetableRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async campus(actor: ActiveAuthority) {
    if (!timetableDemoDraftsEnabled()) throw new NotFoundException();
    if (actor.activeRole !== 'DOMAIN_ADMIN' || !actor.assignmentId)
      throw new ForbiddenException('This fictional rule draft needs an active campus domain appointment.');
    const now = new Date();
    const assignment = await this.prisma.roleAssignment.findFirst({
      where: {
        id: actor.assignmentId,
        accountId: actor.accountId,
        role: 'DOMAIN_ADMIN',
        scopeType: 'CAMPUS',
        scopeRef: { startsWith: 'DEMO-' },
        capabilities: { has: 'timetable-demo-rules-draft' },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
      },
      select: { scopeRef: true },
    });
    if (!assignment)
      throw new ForbiddenException('This fictional rule draft needs an active campus domain appointment.');
    const campus = await this.prisma.institutionUnit.findUnique({
      where: { code: assignment.scopeRef },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!campus || campus.versions[0]?.unitType !== 'CAMPUS')
      throw new ForbiddenException('The fictional campus is not configured.');
    return campus;
  }

  async list(actor: ActiveAuthority) {
    const campus = await this.campus(actor);
    const periods = await this.prisma.academicPeriod.findMany({
      where: { code: { startsWith: 'DEMO-' } },
      orderBy: { code: 'asc' }, take: 30,
      select: { id: true, code: true },
    });
    const versions = await this.prisma.timetableDemoRuleDraft.findMany({
      where: { campusUnitId: campus.id },
      orderBy: { version: 'desc' },
      take: 20,
      select: {
        id: true,
        version: true,
        roomTurnaroundMinutes: true,
        maxOccurrences: true,
        campusTravelMinutes: true,
        periodId: true,
        teachingStartDate: true,
        teachingEndDate: true,
        dailyStartTime: true,
        dailyEndTime: true,
        allowedWeekdays: true,
        maxSessionMinutes: true,
        createdAt: true,
      },
    });
    return { campusCode: campus.code, status: 'FICTIONAL_DRAFT_ONLY', periods, versions: versions.map((row) => ({
      ...row, planningPolicyComplete: !!toPlanningRules(row),
    })) };
  }

  async create(actor: ActiveAuthority, raw: unknown) {
    const campus = await this.campus(actor);
    const command = parseDraftCommand(raw);
    const period = await this.prisma.academicPeriod.findUnique({ where: { id: command.periodId }, select: { code: true } });
    if (!period || !period.code.startsWith('DEMO-'))
      throw new BadRequestException('Select a configured fictional academic period.');
    const codes = [...new Set(command.travel.flatMap((row) => [row.fromCampus, row.toCampus]))];
    if (codes.length) {
      const registered = await this.prisma.institutionUnit.findMany({
        where: { code: { in: codes } },
        select: {
          code: true,
          versions: { orderBy: { version: 'desc' }, take: 1, select: { unitType: true } },
        },
      });
      if (
        registered.length !== codes.length ||
        registered.some((unit) => unit.versions[0]?.unitType !== 'CAMPUS')
      ) throw new BadRequestException('Use registered fictional campuses for travel rules.');
    }
    const content = {
      campusCode: campus.code,
      periodId: command.periodId,
      teachingStartDate: command.teachingStartDate,
      teachingEndDate: command.teachingEndDate,
      dailyStartTime: command.dailyStartTime,
      dailyEndTime: command.dailyEndTime,
      allowedWeekdays: command.allowedWeekdays,
      maxSessionMinutes: command.maxSessionMinutes,
      roomTurnaroundMinutes: command.roomTurnaroundMinutes,
      maxOccurrences: command.maxOccurrences,
      travel: command.travel,
    };
    const digest = createHash('sha256').update(JSON.stringify(content)).digest('hex');
    const existing = await this.prisma.timetableDemoRuleDraft.findUnique({
      where: {
        createdByAccountId_clientRequestId: {
          createdByAccountId: actor.accountId,
          clientRequestId: command.clientRequestId,
        },
      },
    });
    if (existing) {
      if (existing.contentDigest !== digest || existing.campusUnitId !== campus.id)
        throw new ConflictException('This save reference was used for different rules.');
      return { id: existing.id, version: existing.version, status: 'FICTIONAL_DRAFT_ONLY' };
    }
    try {
      const saved = await this.prisma.$transaction(async (db) => {
        const now = new Date();
        const liveAssignment = await db.roleAssignment.findFirst({
          where: {
            id: actor.assignmentId!,
            accountId: actor.accountId,
            role: 'DOMAIN_ADMIN',
            scopeType: 'CAMPUS',
            scopeRef: campus.code,
            capabilities: { has: 'timetable-demo-rules-draft' },
            startsAt: { lte: now },
            revokedAt: null,
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            account: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
          },
          select: { id: true },
        });
        if (!liveAssignment)
          throw new ForbiddenException('The fictional campus appointment changed. This draft was not saved.');
        const latest = await db.timetableDemoRuleDraft.findFirst({
          where: { campusUnitId: campus.id },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        if ((latest?.version ?? 0) !== command.expectedVersion)
          throw new ConflictException('This draft changed. Reload the latest version before saving.');
        const row = await db.timetableDemoRuleDraft.create({
          data: {
            campusUnitId: campus.id,
            version: command.expectedVersion + 1,
            periodId: command.periodId,
            teachingStartDate: new Date(`${command.teachingStartDate}T00:00:00.000Z`),
            teachingEndDate: new Date(`${command.teachingEndDate}T00:00:00.000Z`),
            dailyStartTime: command.dailyStartTime,
            dailyEndTime: command.dailyEndTime,
            allowedWeekdays: command.allowedWeekdays,
            maxSessionMinutes: command.maxSessionMinutes,
            roomTurnaroundMinutes: command.roomTurnaroundMinutes,
            maxOccurrences: command.maxOccurrences,
            campusTravelMinutes: command.travel.map((row) => ({
              fromCampus: row.fromCampus,
              toCampus: row.toCampus,
              minutes: row.minutes,
            })),
            createdByAccountId: actor.accountId,
            clientRequestId: command.clientRequestId,
            contentDigest: digest,
          },
          select: { id: true, version: true },
        });
        await db.auditEvent.create({
          data: {
            action: 'DemoTimetableRuleDraftSaved',
            outcome: 'ALLOW',
            actorAccountId: actor.accountId,
            activeRole: actor.activeRole,
            scope: actor.scope,
            targetRef: row.id,
            idempotencyRef: command.clientRequestId,
            purpose: 'fictional-timetable-rules',
            policyVersion: SECURITY_V1.version,
            correlationId: randomUUID(),
          },
        });
        return row;
      });
      return { ...saved, status: 'FICTIONAL_DRAFT_ONLY' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const replay = await this.prisma.timetableDemoRuleDraft.findUnique({
        where: {
          createdByAccountId_clientRequestId: {
            createdByAccountId: actor.accountId,
            clientRequestId: command.clientRequestId,
          },
        },
      });
      if (replay && replay.contentDigest === digest && replay.campusUnitId === campus.id)
        return { id: replay.id, version: replay.version, status: 'FICTIONAL_DRAFT_ONLY' };
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) throw new ConflictException('The draft changed. Reload and try again.');
      throw error;
    }
  }
}
