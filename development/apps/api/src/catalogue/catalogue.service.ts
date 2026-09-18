import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AUTH_MESSAGES, CATALOGUE_V1 } from '@sis/config';
import type {
  AvailabilityStatus,
  CataloguePage,
  CompareResult,
  GuidanceEvaluation,
  ProgrammeOfferingDetail,
  ProgrammeSummary,
  RequirementRule,
} from '@sis/contracts';
import { RateLimiter } from '../identity-access/rate-limit.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  canStartApplication,
  evaluateGuidance,
  limitComparison,
  selectLatestRules,
} from './guidance.js';
import { cappedTake } from './dto.js';

export interface SearchParams {
  q?: string;
  school?: string;
  level?: string;
  mode?: string;
  campus?: string;
  intake?: string;
  route?: string;
  availability?: string;
  skip?: number;
  take?: number;
}

// UUID v4 shape guard for compare ids (see compare()).
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NOT_FOUND_MESSAGE = 'Programme offering not found.';

// Catalogue reads (applicant journey Part 2). Controllers delegate here
// (18.1); every failure uses DISC-* templates, never invented copy.
@Injectable()
export class CatalogueService {
  readonly limiter = new RateLimiter();

  constructor(private readonly prisma: PrismaService) {}

  private toSummary(
    offering: {
      id: string;
      intake: string;
      studyMode: string;
      campus: string;
      availability: string;
      deadline: Date | null;
      statusNote: string | null;
      programme: {
        name: string;
        awardLevel: string;
        school: string;
        duration: string;
        publishedVersion: string;
        updatedAt: Date;
      };
    },
    rules: Array<{ label: string; mandatory: boolean }>,
  ): ProgrammeSummary {
    const mandatory = rules.filter((r) => r.mandatory).map((r) => r.label);
    const optional = rules.filter((r) => !r.mandatory).map((r) => r.label);
    const shown = mandatory.slice(0, 3).join(', ');
    const rest =
      mandatory.length > 3 ? ` and ${mandatory.length - 3} more` : '';
    return {
      offeringId: offering.id,
      programmeName: offering.programme.name,
      awardLevel: offering.programme.awardLevel,
      school: offering.programme.school,
      duration: offering.programme.duration,
      campus: offering.campus,
      studyMode: offering.studyMode,
      intake: offering.intake,
      availability: offering.availability as AvailabilityStatus,
      deadline: offering.deadline ? offering.deadline.toISOString() : null,
      requirementSummary:
        mandatory.length > 0 ? `Requires ${shown}${rest}.` : '',
      // Handbook §5: core vs additional selection requirements stay separate.
      additionalSummary: optional.length > 0 ? optional.join(', ') : '',
      publishedVersion: offering.programme.publishedVersion,
      lastUpdated: offering.programme.updatedAt.toISOString(),
      statusNote: offering.statusNote,
    };
  }

  async routes(): Promise<{ routes: Array<{ code: string; label: string }> }> {
    const rows = await this.prisma.qualificationRoute.findMany({
      orderBy: { code: 'asc' },
    });
    return {
      routes: rows.map((r) => ({ code: r.code, label: r.label })),
    };
  }

  async search(params: SearchParams): Promise<CataloguePage> {
    const take = cappedTake(params.take);
    const skip = params.skip ?? 0;
    const q = params.q?.trim();
    const where: Record<string, unknown> = {};
    if (q) {
      const contains = { contains: q, mode: 'insensitive' as const };
      where.OR = [
        { programme: { name: contains } },
        { programme: { school: contains } },
        { programme: { code: contains } },
      ];
    }
    if (params.school) {
      where.programme = {
        ...(typeof where.programme === 'object' && where.programme !== null
          ? (where.programme as Record<string, unknown>)
          : {}),
        school: { contains: params.school, mode: 'insensitive' as const },
      };
    }
    if (params.level) {
      where.programme = {
        ...(typeof where.programme === 'object' && where.programme !== null
          ? (where.programme as Record<string, unknown>)
          : {}),
        awardLevel: { contains: params.level, mode: 'insensitive' as const },
      };
    }
    if (params.mode) {
      where.studyMode = { contains: params.mode, mode: 'insensitive' as const };
    }
    if (params.campus) {
      where.campus = { contains: params.campus, mode: 'insensitive' as const };
    }
    if (params.intake) where.intake = params.intake;
    if (params.availability) where.availability = params.availability;
    if (params.route) {
      where.programme = {
        ...(typeof where.programme === 'object' && where.programme !== null
          ? (where.programme as Record<string, unknown>)
          : {}),
        rules: { some: { route: { code: params.route } } },
      };
    }
    const [total, rows] = await Promise.all([
      this.prisma.programmeOffering.count({ where }),
      this.prisma.programmeOffering.findMany({
        where,
        include: {
          programme: {
            include: { rules: { select: { label: true, mandatory: true } } },
          },
        },
        orderBy: [{ programme: { name: 'asc' } }, { intake: 'asc' }],
        skip,
        take,
      }),
    ]);
    return {
      items: rows.map((r) => this.toSummary(r, r.programme.rules)),
      total,
      skip,
      take,
    };
  }

  async detail(id: string): Promise<ProgrammeOfferingDetail | null> {
    const offering = await this.prisma.programmeOffering.findUnique({
      where: { id },
      include: {
        programme: { include: { rules: { include: { route: true } } } },
      },
    });
    if (!offering) return null;
    // Concurrent rule versions share ruleKey (unique is programme+ruleKey+
    // version): latest wins so facts keys and React keys never collide.
    const rules = selectLatestRules(offering.programme.rules);
    const evidence = [...new Set(rules.map((r) => r.evidence))];
    const checklist = [
      ...evidence,
      `Application fee: see ${offering.programme.feeScheduleRef}`,
    ];
    if (offering.deadline) {
      checklist.push(`Submission deadline: ${offering.deadline.toISOString()}`);
    }
    return {
      ...this.toSummary(offering, rules),
      programmeCode: offering.programme.code,
      overview: offering.programme.overview,
      entryRequirements: rules.map((r) => ({
        id: r.ruleKey,
        label: r.label,
        kind: r.kind as RequirementRule['kind'],
        mandatory: r.mandatory,
        minGrade: r.minGrade,
        requiresVerification: r.requiresVerification,
        evidence: r.evidence,
        routeCode: r.route ? r.route.code : null,
      })),
      checklist,
      feeScheduleRef: offering.programme.feeScheduleRef,
      publishedVersion: offering.programme.publishedVersion,
      effectiveDate: offering.programme.effectiveDate.toISOString(),
      lastUpdated: offering.programme.updatedAt.toISOString(),
      owningOffice: offering.programme.owningOffice,
      statusNote: offering.statusNote,
      canStart: canStartApplication(
        offering.availability as AvailabilityStatus,
      ),
    };
  }

  async compare(ids: string[]): Promise<CompareResult> {
    // Malformed ids are dropped silently (neutral, no oracle) instead of
    // reaching Postgres as uuid literals (500); dupes collapse so columns
    // and React keys stay unique; truncation counts valid selections.
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const id of ids) {
      const trimmed = id.trim();
      if (UUID_V4.test(trimmed) && !seen.has(trimmed)) {
        seen.add(trimmed);
        clean.push(trimmed);
      }
    }
    const { items, truncated } = limitComparison(clean);
    if (items.length === 0) return { items: [], truncated };
    const rows = await this.prisma.programmeOffering.findMany({
      where: { id: { in: items } },
      include: {
        programme: {
          include: { rules: { select: { label: true, mandatory: true } } },
        },
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      items: items.flatMap((id) => {
        const row = byId.get(id);
        return row ? [this.toSummary(row, row.programme.rules)] : [];
      }),
      truncated,
    };
  }

  async createSession(
    offeringId: string,
    routeCode: string,
  ): Promise<{ sessionId: string; expiresAt: string }> {
    const offering = await this.prisma.programmeOffering.findUnique({
      where: { id: offeringId },
    });
    if (!offering) {
      throw new NotFoundException({ message: NOT_FOUND_MESSAGE });
    }
    const route = await this.prisma.qualificationRoute.findUnique({
      where: { code: routeCode },
    });
    if (!route) {
      throw new BadRequestException({
        message: AUTH_MESSAGES.unknownRoute.text,
      });
    }
    const session = await this.prisma.guidanceSession.create({
      data: {
        expiresAt: new Date(
          Date.now() + CATALOGUE_V1.sessionTtlMinutes * 60 * 1000,
        ),
        payload: { offeringId, routeCode },
      },
    });
    // Opportunistic retention hygiene: expired transient sessions are swept
    // here (no daemon owns this table; rows hold no personal data).
    await this.prisma.guidanceSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async evaluate(
    sessionId: string,
    facts: Record<string, unknown>,
  ): Promise<
    GuidanceEvaluation & {
      programmeName: string;
      intake: string;
      disclaimer: string;
    }
  > {
    const session = await this.prisma.guidanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.prisma.guidanceSession.delete({ where: { id: sessionId } });
      }
      throw new NotFoundException({
        message: AUTH_MESSAGES.sessionGone.text,
      });
    }
    const payload = session.payload as {
      offeringId: string;
      routeCode: string;
    };
    const offering = await this.prisma.programmeOffering.findUnique({
      where: { id: payload.offeringId },
      include: {
        programme: { include: { rules: { include: { route: true } } } },
      },
    });
    if (!offering) {
      throw new NotFoundException({ message: NOT_FOUND_MESSAGE });
    }
    const applicable = selectLatestRules(
      offering.programme.rules.filter(
        (r) => r.route === null || r.route.code === payload.routeCode,
      ),
    );
    const rules: RequirementRule[] = applicable.map((r) => ({
      id: r.ruleKey,
      label: r.label,
      kind: r.kind as RequirementRule['kind'],
      mandatory: r.mandatory,
      minGrade: r.minGrade,
      requiresVerification: r.requiresVerification,
      evidence: r.evidence,
      routeCode: r.route ? r.route.code : null,
    }));
    const clean: Record<
      string,
      { value?: string | number | boolean; unknown?: boolean }
    > = {};
    for (const rule of rules) {
      const entry = facts[rule.id];
      if (typeof entry !== 'object' || entry === null) continue;
      const { value, unknown } = entry as {
        value?: unknown;
        unknown?: unknown;
      };
      const fact: { value?: string | number | boolean; unknown?: boolean } = {};
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        fact.value = value;
      }
      if (typeof unknown === 'boolean') fact.unknown = unknown;
      clean[rule.id] = fact;
    }
    const result = evaluateGuidance(rules, clean);
    return {
      ...result,
      programmeName: offering.programme.name,
      intake: offering.intake,
      disclaimer: AUTH_MESSAGES.guidanceDisclaimer.text,
    };
  }
}
