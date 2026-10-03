import styles from "../page.module.css";
import discovery from "./discover.module.css";
import Link from "next/link";
import { AUTH_MESSAGES } from "@sis/config";
import { Empty } from "@sis/ui";
import { Notice } from "@sis/ui";
import { ProgrammeCard } from "@sis/ui";
import { formatLusaka } from "../../lib/time";
import { SearchForm } from "./search-form";
import { availabilityText } from "./availability";
import type { CataloguePage } from "@sis/contracts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find a programme",
  description:
    "Search approved programmes, compare offerings and check eligibility guidance without creating an account.",
};

const SEARCH_KEYS = [
  "q",
  "school",
  "level",
  "mode",
  "campus",
  "intake",
  "route",
  "availability",
  "skip",
  "take",
] as const;

async function loadProgrammes(
  params: Record<string, string | string[] | undefined>,
): Promise<CataloguePage | null> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  const search = new URLSearchParams();
  for (const key of SEARCH_KEYS) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) search.set(key, first);
  }
  try {
    // Offering availability and deadlines can change during a live intake.
    // Do not retain a published offering from a previous database/release.
    const res = await fetch(`${api}/catalogue/programmes?${search}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CataloguePage;
  } catch {
    return null;
  }
}

async function loadRoutes(): Promise<Array<{ code: string; label: string }>> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    // Qualification routes are reference data: cache for 5 minutes like the
    // programme catalogue above.
    const res = await fetch(`${api}/catalogue/routes`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (
      (await res.json()) as {
        routes: Array<{ code: string; label: string }>;
      }
    ).routes;
  } catch {
    return [];
  }
}

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first || undefined;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [page, routes] = await Promise.all([
    loadProgrammes(params),
    loadRoutes(),
  ]);
  const initial: Record<string, string> = {};
  for (const key of SEARCH_KEYS) {
    const first = firstParam(params, key);
    if (first) initial[key] = first;
  }
  const hasQuery = SEARCH_KEYS.some(
    (key) => key !== "skip" && key !== "take" && firstParam(params, key),
  );
  const schools =
    page && !hasQuery
      ? [...new Set(page.items.map((item) => item.school))].sort()
      : [];
  const compareIds = (firstParam(params, "compare") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  function trayHref(offeringId: string): string {
    const next = new URLSearchParams();
    for (const key of SEARCH_KEYS) {
      const first = firstParam(params, key);
      if (first) next.set(key, first);
    }
    const ids = compareIds.includes(offeringId)
      ? compareIds
      : [...compareIds, offeringId].slice(0, 3);
    next.set("compare", ids.join(","));
    return `/discover?${next.toString()}`;
  }
  const comparePageHref =
    compareIds.length > 0
      ? `/discover/compare?ids=${encodeURIComponent(compareIds.join(","))}`
      : null;
  function pageHref(skip: number): string {
    const next = new URLSearchParams();
    for (const key of SEARCH_KEYS) {
      if (key === "skip") continue;
      const value = firstParam(params, key);
      if (value) next.set(key, value);
    }
    const compare = firstParam(params, "compare");
    if (compare) next.set("compare", compare);
    if (skip > 0) next.set("skip", String(skip));
    return `/discover?${next.toString()}`;
  }
  const showPager = page !== null && page.total > page.take;
  return (
    <div className={discovery.page}>
      <main id="main-content" className={discovery.main}>
        <header
          className={`${discovery.heading} border-b border-sis-border pb-6`}
        >
          <p className={styles.context}>Admissions · Public catalogue</p>
          <h1 className={styles.title}>Find a programme</h1>
          <p className={styles.lede}>
            Search by programme name, subject or qualification.{" "}
            <Link href="/sign-in">Sign in</Link> when you are ready to apply.
          </p>
        </header>
        <SearchForm initial={initial} routes={routes} />
        {page === null ? (
          <Notice
            severity="error"
            title="Catalogue temporarily unavailable"
            message={`Programme listings cannot be shown right now. ${AUTH_MESSAGES.keptState.text} Or contact Admissions.`}
          />
        ) : page.items.length === 0 && page.total > 0 ? (
          <Empty
            caseVariant="nothing"
            title="This result page has changed"
            message="The catalogue changed since you opened this page. Return to the first page to see current results."
            action={{ label: "First page", href: pageHref(0) }}
          />
        ) : page.items.length === 0 ? (
          <Empty
            caseVariant="nothing"
            title="No programmes found"
            message={AUTH_MESSAGES.noResults.text}
            action={{ label: "Clear search", href: "/discover" }}
          />
        ) : (
          <section
            className={discovery.results}
            aria-labelledby="programme-results-title"
          >
            <div className={discovery.resultsHeading}>
              <h2 id="programme-results-title">Programme results</h2>
              <p className={discovery.resultCount} role="status">
                {page.total} {page.total === 1 ? "programme" : "programmes"}{" "}
                listed.
              </p>
            </div>
            {schools.length > 0 ? (
              <p className={discovery.schools}>
                Browse by school:{" "}
                {schools.map((school, index) => (
                  <span key={school}>
                    {index > 0 ? " · " : null}
                    <Link
                      href={`/discover?school=${encodeURIComponent(school)}`}
                    >
                      {school}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            {comparePageHref ? (
              <p className={discovery.comparison} role="status">
                {compareIds.length}{" "}
                {compareIds.length === 1 ? "programme" : "programmes"} selected
                for comparison.{" "}
                <Link href={comparePageHref}>View comparison</Link>
              </p>
            ) : null}
            <div className={discovery.programmeGrid}>
              {page.items.map((item) => {
                const selected = compareIds.includes(item.offeringId);
                return (
                  <ProgrammeCard
                    key={item.offeringId}
                    name={item.programmeName}
                    awardLevel={item.awardLevel}
                    school={item.school}
                    intake={item.intake}
                    duration={item.duration}
                    campus={item.campus}
                    studyMode={item.studyMode}
                    availabilityText={availabilityText(item.availability)}
                    deadlineText={
                      item.deadline
                        ? `Applications open until ${formatLusaka(item.deadline)}`
                        : null
                    }
                    requirementSummary={item.requirementSummary}
                    statusNote={item.statusNote}
                    viewHref={`/discover/${item.offeringId}`}
                    compareHref={
                      selected
                        ? (comparePageHref ?? "")
                        : trayHref(item.offeringId)
                    }
                    compareSelected={selected}
                  />
                );
              })}
            </div>
            {showPager ? (
              <nav
                className={discovery.pager}
                aria-label="Programme result pages"
              >
                <p className={discovery.resultCount} role="status">
                  Showing {page.skip + 1}–{page.skip + page.items.length} of{" "}
                  {page.total}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {page.skip > 0 ? (
                    <Link
                      className={discovery.pageLink}
                      href={pageHref(Math.max(0, page.skip - page.take))}
                    >
                      Previous page
                    </Link>
                  ) : null}
                  <span className={discovery.pageNumber}>
                    Page {Math.floor(page.skip / page.take) + 1} of{" "}
                    {Math.ceil(page.total / page.take)}
                  </span>
                  {page.skip + page.items.length < page.total ? (
                    <Link
                      className={discovery.pageLink}
                      href={pageHref(page.skip + page.take)}
                    >
                      Next page
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
