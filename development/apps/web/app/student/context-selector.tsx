"use client";

import { useState, useSyncExternalStore } from "react";
import { academicHref } from "../../lib/academic-context";
import {
  isRegistrationContexts,
  type ContextInventory,
} from "../../lib/registration-contexts";
import styles from "./context-selector.module.css";
const subscribe = () => () => {};

/** An owned navigation choice. Never grants eligibility or completes registration. */
export function ContextSelector({
  inventory,
  path,
  current,
}: {
  inventory: ContextInventory;
  path:
    | "/student/timetable"
    | "/student/courses"
    | "/student/readiness"
    | "/student/register";
  current: { attemptId?: string; period?: string };
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [items, setItems] = useState(inventory.data?.items ?? []);
  const [cursor, setCursor] = useState(inventory.data?.nextCursor ?? null);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(inventory.message);
  const chosen = items.find(
    (item) => `${item.attemptId}:${item.period}` === selected,
  );
  const viewing = items.find(
    (item) =>
      item.attemptId === current.attemptId && item.period === current.period,
  );
  async function more() {
    if (!cursor || pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/registration/contexts?${new URLSearchParams({ cursor })}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !isRegistrationContexts(data))
        throw new Error("unavailable");
      setItems((previous) => [
        ...new Map(
          [...previous, ...data.items].map((item) => [
            `${item.attemptId}:${item.period}`,
            item,
          ]),
        ).values(),
      ]);
      setCursor(data.nextCursor);
    } catch {
      setMessage(
        "More study periods could not be checked. Keep your current selection and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className={styles.panel} aria-labelledby="study-period-title">
      <div>
        <h2 id="study-period-title">Study period</h2>
        <p>Choose a programme and period. Registration rules still apply.</p>
      </div>
      {current.period ? (
        <p>
          Viewing:{" "}
          <strong>
            {viewing
              ? `${viewing.programmeName} · ${viewing.intake} · `
              : "Academic period "}
            {current.period}
          </strong>
        </p>
      ) : null}
      {inventory.data ? (
        <>
          <label htmlFor="study-period-choice">Programme and period</label>
          <select
            id="study-period-choice"
            disabled={!ready}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Choose a study period</option>
            {items.map((item) => (
              <option
                key={`${item.attemptId}:${item.period}`}
                value={`${item.attemptId}:${item.period}`}
              >
                {item.programmeName} · {item.intake} ·{" "}
                {item.periodName ?? item.period}
                {items.filter(
                  (other) =>
                    other.programmeName === item.programmeName &&
                    other.intake === item.intake &&
                    other.period === item.period,
                ).length > 1
                  ? ` · study record ${item.attemptId.slice(-8)}`
                  : ""}{" "}
                · {item.registrationStatus.toLowerCase().replaceAll("_", " ")}
                {item.attemptId === current.attemptId &&
                item.period === current.period
                  ? " · viewing"
                  : ""}
              </option>
            ))}
          </select>
          {chosen ? (
            <a className={styles.action} href={academicHref(path, chosen)}>
              Open study period
            </a>
          ) : (
            <p>Select a programme and period to open it.</p>
          )}
          {cursor ? (
            <button
              type="button"
              onClick={() => void more()}
              disabled={pending || !ready}
            >
              {pending ? "Loading study periods…" : "Load more study periods"}
            </button>
          ) : (
            <p className={styles.meta}>
              {items.length} available study{" "}
              {items.length === 1 ? "context" : "contexts"} checked.
            </p>
          )}
        </>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
