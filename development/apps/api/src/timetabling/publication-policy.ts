import { BadRequestException } from '@nestjs/common';
import type { DemoTimetablePublicationCommand } from '@sis/contracts';
export const TIMETABLE_PUBLICATION_POLICY = 'DEMO-TIME-PUBLISH-2026.1';
export const timetableUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parsePublicationCommand(
  raw: unknown,
): DemoTimetablePublicationCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new BadRequestException(
      'Review the saved fictional timetable before publishing.',
    );
  const value = raw as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          'clientRequestId',
          'contentDigest',
          'expectedPublicationId',
          'reviewed',
          'fictionalOnly',
          'password',
          'reason',
        ].includes(key),
    ) ||
    typeof value.clientRequestId !== 'string' ||
    !timetableUuid.test(value.clientRequestId) ||
    typeof value.contentDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.contentDigest) ||
    !(
      value.expectedPublicationId === null ||
      (typeof value.expectedPublicationId === 'string' &&
        timetableUuid.test(value.expectedPublicationId))
    ) ||
    value.reviewed !== true ||
    value.fictionalOnly !== true ||
    typeof value.password !== 'string' ||
    value.password.length === 0 ||
    value.password.length > 1024 ||
    typeof value.reason !== 'string' ||
    value.reason.trim().length < 10 ||
    value.reason.trim().length > 500
  )
    throw new BadRequestException(
      'Confirm the exact version, both review declarations, decision reason and your current password. No timetable was published.',
    );
  return {
    clientRequestId: value.clientRequestId,
    contentDigest: value.contentDigest,
    expectedPublicationId: value.expectedPublicationId,
    reviewed: true,
    fictionalOnly: true,
    reason: value.reason.trim(),
    password: value.password,
  };
}
