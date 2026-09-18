import { validate } from 'class-validator';
import type {
  CataloguePage,
  CompareResult,
  ProgrammeOfferingDetail,
  ProgrammeSummary,
} from '@sis/contracts';
import {
  CompareQuery,
  CreateGuidanceSessionBody,
  EvaluateGuidanceBody,
  SearchCatalogueQuery,
  cappedTake,
} from './dto.js';

// Structural proof that local DTOs satisfy the canonical contracts package
// (same pattern as auth-contract.spec). Runtime assertions prove validation.
function consumesPage(page: CataloguePage): number {
  return page.total;
}

describe('catalogue contract compatibility', () => {
  it('DTO shapes satisfy canonical contracts', () => {
    const query = new SearchCatalogueQuery();
    query.q = 'software';
    query.take = 12;
    expect(query.q).toBe('software');
    const page: CataloguePage = { items: [], total: 0, skip: 0, take: 12 };
    expect(consumesPage(page)).toBe(0);
    const summary: ProgrammeSummary = {
      offeringId: 'o',
      programmeName: 'n',
      awardLevel: 'a',
      school: 's',
      duration: 'd',
      campus: 'c',
      studyMode: 'm',
      intake: '2026S1',
      availability: 'OPEN',
      deadline: null,
      requirementSummary: 'r',
      additionalSummary: '',
      publishedVersion: 'v',
      lastUpdated: 'u',
      statusNote: null,
    };
    expect(summary.availability).toBe('OPEN');
    const detail: ProgrammeOfferingDetail = {
      ...summary,
      programmeCode: 'SWE',
      overview: 'o',
      entryRequirements: [],
      checklist: [],
      feeScheduleRef: 'f',
      publishedVersion: 'v',
      effectiveDate: 'e',
      lastUpdated: 'u',
      owningOffice: 'Admissions',
      statusNote: null,
      canStart: true,
    };
    expect(detail.canStart).toBe(true);
    const compared: CompareResult = { items: [], truncated: false };
    expect(compared.truncated).toBe(false);
    const session = new CreateGuidanceSessionBody();
    session.offeringId = '00000000-0000-4000-8000-000000000000';
    session.routeCode = 'ECZ';
    expect(session.routeCode).toBe('ECZ');
    const evaluation = new EvaluateGuidanceBody();
    evaluation.sessionId = session.offeringId;
    evaluation.facts = {};
    expect(evaluation.facts).toEqual({});
  });

  it('rejects unknown availability and oversized take at the DTO boundary', async () => {
    const bad = new SearchCatalogueQuery();
    bad.availability = 'WHENEVER';
    bad.take = 500;
    const errors = await validate(bad);
    expect(errors.length).toBeGreaterThan(0);
    const compare = new CompareQuery();
    compare.ids = '';
    const compareErrors = await validate(compare);
    expect(compareErrors.length).toBeGreaterThan(0);
  });

  it('caps take at CATALOGUE-v1 maximum, never hardcoded', async () => {
    expect(cappedTake(500)).toBe(50);
    expect(cappedTake(undefined)).toBe(12);
    expect(cappedTake(5)).toBe(5);
  });
});
