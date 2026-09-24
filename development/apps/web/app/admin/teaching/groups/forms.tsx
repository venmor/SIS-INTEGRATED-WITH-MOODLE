"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorSummary, Notice } from "@sis/ui";

interface FieldError {
  fieldId: string;
  message: string;
}

async function postTeaching(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`/api/teaching${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      (data as { message?: string }).message ??
        "The teaching service could not complete this request.",
    );
    (error as { detail?: unknown }).detail = data;
    throw error;
  }
  return data;
}

function failure(error: unknown): string {
  if (error instanceof Error) {
    const detail = (error as { detail?: { supportReference?: string } }).detail;
    return `${error.message}${detail?.supportReference ? ` Support reference: ${detail.supportReference}.` : ""}`;
  }
  return "We could not confirm the result. Check the current state before retrying.";
}

// Coordinator TG workspace: create groups, allocate students with reasons,
// activate once a tutor is assigned. Activation refuses without a tutor.
export function GroupForms() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function act(
    path: string,
    body: Record<string, unknown>,
    done: string,
    form: HTMLFormElement,
  ) {
    if (pending) return;
    setPending(path);
    setErrors([]);
    setNotice(null);
    try {
      await postTeaching(path, {
        ...body,
        idempotencyKey: crypto.randomUUID(),
      });
      setNotice(done);
      form.reset();
      router.refresh();
    } catch (error) {
      setErrors([{ fieldId: "tg-name", message: failure(error) }]);
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {notice ? (
        <Notice severity="success" title="Done" message={notice} />
      ) : null}
      {errors.length > 0 ? (
        <ErrorSummary title="The group was not updated" errors={errors} />
      ) : null}
      <h2>Create tutorial group</h2>
      <form
        aria-label="Create tutorial group"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            "/groups",
            {
              offeringId: String(data.get("tg-offering") ?? ""),
              name: String(data.get("tg-name") ?? ""),
              capacity: Number(data.get("tg-capacity") ?? 0),
              meetingPattern: String(data.get("tg-pattern") ?? "") || undefined,
            },
            "Tutorial group created as a draft. Assign a tutor, then activate it.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="tg-offering">Programme offering ID</label>{" "}
          <input id="tg-offering" name="tg-offering" type="text" required />
        </p>
        <p>
          <label htmlFor="tg-name">Group name</label>{" "}
          <input id="tg-name" name="tg-name" type="text" maxLength={32} required />
        </p>
        <p>
          <label htmlFor="tg-capacity">Capacity</label>{" "}
          <input id="tg-capacity" name="tg-capacity" type="number" min={1} required />
        </p>
        <p>
          <label htmlFor="tg-pattern">Meeting pattern (optional)</label>{" "}
          <input id="tg-pattern" name="tg-pattern" type="text" maxLength={200} />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Creating…" : "Create group"}
          </button>
        </p>
      </form>
      <h2>Allocate a student</h2>
      <form
        aria-label="Allocate student to group"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            `/groups/${String(data.get("alloc-group") ?? "")}/allocate`,
            {
              studentNumber: String(data.get("alloc-student") ?? ""),
              reason: String(data.get("alloc-reason") ?? ""),
            },
            "Student allocated. Over-enrolled or duplicate allocations are refused.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="alloc-group">Group ID</label>{" "}
          <input id="alloc-group" name="alloc-group" type="text" required />
        </p>
        <p>
          <label htmlFor="alloc-student">Student number</label>{" "}
          <input id="alloc-student" name="alloc-student" type="text" maxLength={32} required />
        </p>
        <p>
          <label htmlFor="alloc-reason">Reason</label>{" "}
          <input id="alloc-reason" name="alloc-reason" type="text" maxLength={2000} required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Allocating…" : "Allocate student"}
          </button>
        </p>
      </form>
      <h2>Activate a group</h2>
      <form
        aria-label="Activate tutorial group"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void act(
            `/groups/${String(data.get("activate-group") ?? "")}/activate`,
            {},
            "Group activated. Students may now be allocated.",
            e.currentTarget,
          );
        }}
      >
        <p>
          <label htmlFor="activate-group">Group ID</label>{" "}
          <input id="activate-group" name="activate-group" type="text" required />
        </p>
        <p>
          <button type="submit" disabled={pending !== null}>
            {pending ? "Activating…" : "Activate group"}
          </button>
        </p>
      </form>
    </>
  );
}
