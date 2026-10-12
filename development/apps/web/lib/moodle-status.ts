import type { ConnectionView } from "@sis/contracts";

/** Deferred 2xx responses are waiting states, not successful commands. */
export function notProvisionedMessage(value: unknown): string | null {
  if (
    typeof value !== "object" || value === null ||
    !("outcome" in value) || value.outcome !== "NOT_PROVISIONED"
  ) return null;
  return "detail" in value && typeof value.detail === "string" && value.detail.trim()
    ? value.detail
    : "Moodle is waiting for authorized live setup. No action was performed.";
}

export function moodleBackendLabel(backend: ConnectionView["backend"]): string {
  if (backend === "live-test-disabled") return "Live test disabled";
  if (backend === "live-test") return "Live test — synthetic only";
  if (backend === "simulator") return "Simulator";
  return "Backend unavailable";
}
