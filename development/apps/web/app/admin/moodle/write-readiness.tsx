import type { MoodleWriteReadiness } from "@sis/contracts";
import { Notice } from "@sis/ui";

export function WaitingForMoodle({ message }: { message: string | null }) {
  return message ? (
    <Notice severity="info" title="Waiting for Moodle" message={message} />
  ) : null;
}

/** Connection identity and authorization to write are separate facts. */
export function WriteReadinessNotice({
  readiness,
}: {
  readiness?: MoodleWriteReadiness;
}) {
  if (!readiness)
    return (
      <Notice
        severity="warning"
        title="Readiness unavailable"
        message="Moodle write readiness could not be confirmed. Write controls are disabled; saved records are kept."
      />
    );
  if (readiness.outcome !== "NOT_PROVISIONED") return null;
  return (
    <Notice
      severity="info"
      title="Live writes disabled"
      message={readiness.detail}
    />
  );
}
