"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@sis/ui";
import { Field } from "@sis/ui";
import { FilterGroup } from "@sis/ui";
import styles from "./discover.module.css";

// Search + labelled filters (Part 2 §3.1). Text inputs for open vocabularies
// (school/campus/intake come from data, never hardcoded lists); selects only
// for fixed option sets (levels/modes from §3.1, availability states, and the
// route list supplied server-side from the database). Submits into the page
// URL so results are shareable and restorable (approved deviation 1);
// submitted values restore via defaultValue (URL is the state).
const LEVELS = ["Certificate", "Diploma", "Bachelor's", "Master's", "PhD"];
const MODES = ["Full-time", "Part-time", "Distance", "Online"];
const AVAILABILITY = [
  { value: "OPEN", label: "Open for applications" },
  { value: "SOON", label: "Opens soon" },
  { value: "CLOSED", label: "Not currently open" },
];

const FILTER_LABELS: Record<string, string> = {
  school: "School",
  level: "Level",
  mode: "Study mode",
  campus: "Campus",
  intake: "Intake",
  route: "Qualification route",
  availability: "Availability",
};

const FILTER_KEYS = [
  "q",
  "school",
  "level",
  "mode",
  "campus",
  "intake",
  "route",
  "availability",
];

export function SearchForm({
  initial,
  routes,
}: {
  initial: Record<string, string>;
  routes: Array<{ code: string; label: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    // Preserve the compare tray across searches (approval: tray is URL state).
    const compare = params.get("compare");
    if (compare) next.set("compare", compare);
    const query = next.toString();
    router.push(`/discover${query ? `?${query}` : ""}`);
  }

  const active = Object.keys(FILTER_LABELS).filter((key) => params.get(key));
  function removeHref(key: string): string {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    const query = next.toString();
    return `/discover${query ? `?${query}` : ""}`;
  }

  return (
    <>
      <form
        className={styles.searchForm}
        onSubmit={onSubmit}
        aria-label="Find a programme"
      >
        <div className={styles.searchField}>
          <Field
            id="discover-q"
            label="Search by programme name, subject or qualification"
            defaultValue={initial.q ?? ""}
            inputProps={{ type: "search", name: "q", maxLength: 128 }}
          />
        </div>
        <fieldset className={styles.filters}>
          <legend>Refine your search</legend>
          <div className={styles.filterGrid}>
            <Field
              id="discover-school"
              label="School or faculty"
              defaultValue={initial.school ?? ""}
              inputProps={{ name: "school", maxLength: 64 }}
            />
            <FilterGroup
              id="discover-level"
              label="Level"
              name="level"
              options={LEVELS.map((level) => ({ value: level, label: level }))}
              defaultValue={initial.level ?? ""}
            />
            <FilterGroup
              id="discover-mode"
              label="Study mode"
              name="mode"
              options={MODES.map((mode) => ({ value: mode, label: mode }))}
              defaultValue={initial.mode ?? ""}
            />
            <Field
              id="discover-campus"
              label="Campus or location"
              defaultValue={initial.campus ?? ""}
              inputProps={{ name: "campus", maxLength: 64 }}
            />
            <Field
              id="discover-intake"
              label="Intake"
              defaultValue={initial.intake ?? ""}
              inputProps={{ name: "intake", maxLength: 16 }}
            />
            <FilterGroup
              id="discover-route"
              label="Qualification route"
              name="route"
              options={routes.map((route) => ({
                value: route.code,
                label: route.label,
              }))}
              defaultValue={initial.route ?? ""}
            />
            <FilterGroup
              id="discover-availability"
              label="Availability"
              name="availability"
              options={AVAILABILITY}
              defaultValue={initial.availability ?? ""}
            />
          </div>
        </fieldset>
        <div className={styles.searchActions}>
          <ActionButton type="submit">Search programmes</ActionButton>
        </div>
      </form>
      {active.length > 0 ? (
        <div className={styles.activeFilters}>
          <p>Active filters</p>
          <ul>
            {active.map((key) => (
              <li key={key}>
                {FILTER_LABELS[key]} ({params.get(key)}){" "}
                <Link
                  href={removeHref(key)}
                  aria-label={`Remove ${FILTER_LABELS[key]} filter`}
                >
                  Remove
                </Link>{" "}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
