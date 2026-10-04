import { Injectable } from '@nestjs/common';
import { PrismaService } from '../identity-access/prisma.service.js';

type ReadinessStatus = 'BLOCKED' | 'MISSING' | 'PRESENT_UNVERIFIED';

export interface ReadinessSection {
  id: string;
  label: string;
  status: ReadinessStatus;
  reason: string;
  nextAction: string;
  gapIds: string[];
  counts?: Record<string, number>;
}

@Injectable()
export class InstitutionReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async report(): Promise<{
    overall: 'BLOCKED';
    sampledAt: string;
    sections: ReadinessSection[];
  }> {
    const [
      periods,
      programmes,
      offerings,
      curricula,
      units,
      unitVersions,
      unitRelationships,
      courseVersions,
      deliveryOfferings,
      sections,
      buildings,
      venues,
      courseOnlyRegistrations,
    ] = await Promise.all([
      this.prisma.academicPeriod.count(),
      this.prisma.programme.count(),
      this.prisma.programmeOffering.count(),
      this.prisma.curriculumVersion.count(),
      this.prisma.institutionUnit.count(),
      this.prisma.institutionUnitVersion.count(),
      this.prisma.institutionUnitRelationship.count(),
      this.prisma.courseVersion.count(),
      this.prisma.courseDeliveryOffering.count(),
      this.prisma.teachingSection.count(),
      this.prisma.teachingBuilding.count(),
      this.prisma.teachingVenue.count(),
      this.prisma.courseRegistration.count({ where: { status: 'ENROLLED' } }),
    ]);

    return {
      overall: 'BLOCKED',
      sampledAt: new Date().toISOString(),
      sections: [
        {
          id: 'organization',
          label: 'Institution structure',
          status: 'BLOCKED',
          reason:
            units || unitVersions || unitRelationships
              ? 'Draft structure records exist, but approved effective-dated scope and relationships are unverified.'
              : 'No institution-unit records exist, and approved scope and relationship authority is missing.',
          nextAction:
            'Reconcile unit versions and relationships, then approve scope and change authority.',
          gapIds: ['GAP-004', 'GAP-V2-001'],
          counts: { units, unitVersions, unitRelationships },
        },
        {
          id: 'calendar',
          label: 'Academic periods',
          status: periods > 0 ? 'PRESENT_UNVERIFIED' : 'MISSING',
          reason:
            'Period records do not establish an approved institutional calendar.',
          nextAction:
            'Name the calendar owner and approve effective dates and publication authority.',
          gapIds: ['GAP-V2-001'],
          counts: { periods },
        },
        {
          id: 'catalogue',
          label: 'Programme catalogue',
          status: programmes > 0 ? 'PRESENT_UNVERIFIED' : 'MISSING',
          reason:
            'Catalogue records may be fictional or provisional; approval and ownership are not proven.',
          nextAction:
            'Reconcile programmes, offerings and curriculum versions with the institution.',
          gapIds: ['GAP-004', 'GAP-V2-001'],
          counts: { programmes, offerings, curricula },
        },
        {
          id: 'teaching-delivery',
          label: 'Teaching delivery',
          status: 'BLOCKED',
          reason:
            courseVersions ||
            deliveryOfferings ||
            sections ||
            buildings ||
            venues
              ? 'Draft delivery records exist, but section enrolment, dated sessions and timetable publication are unverified.'
              : 'No delivery identities or venues exist, and section mapping and timetable publication are not configured.',
          nextAction:
            'Reconcile course-only registrations to sections, validate dated sessions and approve a publication route.',
          gapIds: ['GAP-021', 'GAP-V2-001'],
          counts: {
            courseVersions,
            deliveryOfferings,
            sections,
            buildings,
            venues,
            courseOnlyRegistrations,
          },
        },
        {
          id: 'admissions-cycle',
          label: 'Admissions cycles',
          status: 'BLOCKED',
          reason:
            'An approved admission-cycle configuration and authority route are not represented.',
          nextAction:
            'Define cycle ownership, programme routes, dates and independent approval.',
          gapIds: ['GAP-V2-001'],
        },
        {
          id: 'authority',
          label: 'Setup authority',
          status: 'BLOCKED',
          reason:
            'The proposer, approver and publisher for institutional configuration are not approved.',
          nextAction:
            'Record separate scoped appointments, approval evidence and recovery rules.',
          gapIds: ['GAP-006', 'GAP-012', 'GAP-V2-001'],
        },
      ],
    };
  }
}
