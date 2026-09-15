"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, ErrorSummary } from "@sis/ui";
import { AUTH_MESSAGES } from "@sis/config";
import styles from "./page.module.css";

interface Workspace {
  assignmentId: string;
  role: string;
  scopeType: string;
  scopeRef: string;
}

// Deliberate workspace switch (REQ-IAM-002): one button per live workspace,
// double-submit blocked with announced progress, failures summarized with a
// support reference when the API supplies one.
export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: Workspace[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function switchTo(assignmentId: string) {
    if (pendingId) return;
    setPendingId(assignmentId);
    setErrors([]);
    try {
      const res = await fetch("/api/auth/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
        credentials: "same-origin",
        body: JSON.stringify({ assignmentId }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; reference?: string };
      const ref = body.reference ? ` (Reference: ${body.reference})` : "";
      if (res.ok) {
        router.refresh();
        return;
      }
      setErrors([{ fieldId: "workspace", message: `${body.message ?? AUTH_MESSAGES.grantDenied.text}${ref}` }]);
    } catch {
      setErrors([
        {
          fieldId: "workspace",
          message: "We could not confirm whether your request was received. Check your connection, then try again.",
        },
      ]);
    } finally {
      setPendingId(null);
    }
  }

  if (workspaces.length === 0) return null;
  return (
    <div>
      {errors.length > 0 ? <ErrorSummary title="We could not switch workspace." errors={errors} /> : null}
      <ul className={styles.actions} style={{ listStyle: "none", padding: 0 }} id="workspace">
        {workspaces.map((workspace) => {
          const active = workspace.assignmentId === activeId;
          return (
            <li key={workspace.assignmentId}>
              <ActionButton
                kind={active ? "secondary" : "primary"}
                pending={pendingId === workspace.assignmentId}
                loadingText="Switching…"
                disabled={active || pendingId !== null}
                aria-current={active ? "true" : undefined}
                onClick={() => switchTo(workspace.assignmentId)}
              >
                {active
                  ? `${workspace.role} · ${workspace.scopeRef} (active)`
                  : `Switch to ${workspace.role} · ${workspace.scopeRef}`}
              </ActionButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
