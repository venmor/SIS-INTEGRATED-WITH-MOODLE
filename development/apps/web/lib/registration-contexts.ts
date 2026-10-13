import type { RegistrationContextsResponse } from "@sis/contracts";
import { parseAcademicContext } from "./academic-context";

export function isRegistrationContexts(
  value: unknown,
): value is RegistrationContextsResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as RegistrationContextsResponse;
  const key = (item: { attemptId?: unknown; period?: unknown } | null) =>
    !!item &&
    typeof item.attemptId === "string" &&
    typeof item.period === "string" &&
    parseAcademicContext({ attemptId: item.attemptId, period: item.period })
      .valid;
  return (
    data.source === "OWN_REGISTRATION_CONTEXTS" &&
    typeof data.checkedAt === "string" &&
    Number.isFinite(Date.parse(data.checkedAt)) &&
    !!data.configuredPeriod &&
    typeof data.configuredPeriod.code === "string" &&
    parseAcademicContext({ period: data.configuredPeriod.code }).valid &&
    Array.isArray(data.items) &&
    data.items.length <= 20 &&
    data.items.every(
      (item) =>
        key(item) &&
        ["ACTIVE", "ADMITTED"].includes(item.attemptStatus) &&
        ["NOT_STARTED", "DRAFT", "REGISTERED", "REVIEW_REQUIRED"].includes(
          item.registrationStatus,
        ) &&
        [item.programmeCode, item.programmeName, item.intake].every(
          (value) => typeof value === "string",
        ) &&
        typeof item.configuredCurrent === "boolean" &&
        [item.periodName, item.startDate, item.endDate].every(
          (value) => value === null || typeof value === "string",
        ),
    ) &&
    (data.soleRegisteredContext === null || key(data.soleRegisteredContext)) &&
    (data.nextCursor === null ||
      (typeof data.nextCursor === "string" &&
        data.nextCursor.length > 0 &&
        data.nextCursor.length <= 4096))
  );
}

export type ContextInventory = {
  data: RegistrationContextsResponse | null;
  message: string;
};
