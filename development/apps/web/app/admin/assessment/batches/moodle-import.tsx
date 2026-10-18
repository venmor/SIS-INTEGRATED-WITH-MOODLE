"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GradeMappingView } from "@sis/contracts";
import { ErrorSummary, Notice } from "@sis/ui";
import ui from "../../staff-workspace.module.css";
import styles from "../workspace.module.css";

export function MoodleImportForm({
  mappings,
}: {
  mappings: GradeMappingView[];
}) {
  const router = useRouter();
  const request = useRef<{ mappingId: string; key: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; count: number } | null>(
    null,
  );
  return (
    <section className={styles.panel} aria-labelledby="moodle-import-heading">
      <div className={styles.panelHeading}>
        <div>
          <h2 className={ui.sectionHeading} id="moodle-import-heading">
            Import from Moodle
          </h2>
          <p>
            Retrieve assignment or quiz marks for your registered class. Review
            and moderate the saved batch before official publication.
          </p>
        </div>
      </div>
      {error ? (
        <ErrorSummary
          title="Marks were not imported"
          errors={[{ fieldId: "moodle-import-mapping", message: error }]}
        />
      ) : null}
      {saved ? (
        <Notice
          severity="success"
          title="Moodle marks imported"
          message={`${saved.count} student records saved for review.`}
          action={{
            label: "Review batch",
            href: `/admin/assessment/batches/${saved.id}`,
          }}
        />
      ) : null}
      {!mappings.length ? (
        <p className={styles.permissionHint}>
          No active live mapping.{" "}
          <Link href="/admin/assessment/mappings">
            Set up an assessment mapping
          </Link>{" "}
          using the numeric Moodle gradebook item ID.
        </p>
      ) : null}
      <form
        className={ui.form}
        aria-label="Import Moodle marks"
        aria-busy={pending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          const mappingId = String(
            new FormData(event.currentTarget).get("mappingId") ?? "",
          );
          if (!mappingId) return;
          if (request.current?.mappingId !== mappingId)
            request.current = { mappingId, key: crypto.randomUUID() };
          setPending(true);
          setError(null);
          setSaved(null);
          try {
            const response = await fetch(
              `/api/assessment/mappings/${mappingId}/import-moodle`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-requested-with": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify({ idempotencyKey: request.current.key }),
              },
            );
            const body = await response.json();
            if (!response.ok)
              throw new Error(
                typeof body.message === "string"
                  ? body.message
                  : "Import was not confirmed. Retry with this page open to recover the same request.",
              );
            setSaved({ id: body.id, count: body.lines?.length ?? 0 });
            request.current = null;
            router.refresh();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "The import was not confirmed. Check your batches before retrying.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <div className={styles.field}>
          <label className={ui.fieldLabel} htmlFor="moodle-import-mapping">
            Assessment mapping
          </label>
          <select
            id="moodle-import-mapping"
            name="mappingId"
            className={ui.control}
            required
            disabled={pending || !mappings.length}
          >
            <option value="">Choose an active mapping</option>
            {mappings.map((m) => (
              <option key={m.id} value={m.id}>
                Course {m.moodleCourseRef} · Grade item {m.moodleActivityId} ·
                Version {m.version}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <button
            className={ui.button}
            type="submit"
            disabled={pending || !mappings.length}
          >
            {pending ? "Retrieving Moodle marks…" : "Import marks"}
          </button>
        </div>
        <p role="status" aria-live="polite">
          {pending
            ? "Checking the connection, registered students and grade evidence. Keep this page open."
            : "Imported marks remain provisional until the academic approval workflow is complete."}
        </p>
      </form>
    </section>
  );
}
