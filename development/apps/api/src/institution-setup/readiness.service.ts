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
    const [periods, programmes, offerings, curricula] = await Promise.all([
      this.prisma.academicPeriod.count(),
      this.prisma.programme.count(),
      this.prisma.programmeOffering.count(),
      this.prisma.curriculumVersion.count(),
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
            'The effective-dated organisation and scope registry is not in place.',
          nextAction:
            'Approve the organisation relationship and scope authority design.',
          gapIds: ['GAP-004', 'GAP-V2-001'],
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
