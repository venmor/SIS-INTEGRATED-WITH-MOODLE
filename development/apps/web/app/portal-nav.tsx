"use client";

import Link from "next/link";
import { academicHref, parseAcademicContext } from "../lib/academic-context";
import { useSearchParams, usePathname } from "next/navigation";
import styles from "./portal-nav.module.css";
import { NavigationIcon } from "./navigation-icon";

export interface PortalLink {
  href: string;
  label: string;
}

export function PortalNav({
  label,
  links,
}: {
  label: string;
  links: PortalLink[];
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const context = parseAcademicContext({
    attemptId:
      search.getAll("attemptId").length > 1
        ? search.getAll("attemptId")
        : (search.get("attemptId") ?? undefined),
    period:
      search.getAll("period").length > 1
        ? search.getAll("period")
        : (search.get("period") ?? undefined),
  });
  const content = links.map(({ href, label: itemLabel }) => {
    const current =
      pathname === href ||
      (href !== "/student" &&
        href !== "/applicant" &&
        pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={
          pathname.startsWith("/student") &&
          context.valid &&
          [
            "/student/readiness",
            "/student/courses",
            "/student/register",
            "/student/timetable",
          ].includes(href)
            ? academicHref(href, Object.fromEntries(context.query))
            : href
        }
        aria-current={current ? "page" : undefined}
        className={current ? styles.current : undefined}
      >
        <NavigationIcon href={href} />
        <span>{itemLabel}</span>
      </Link>
    );
  });
  return (
    <>
      <nav aria-label={label} className={styles.desktop}>
        {content}
      </nav>
      <details className={styles.mobile}>
        <summary>Portal sections</summary>
        <nav aria-label={label}>{content}</nav>
      </details>
    </>
  );
}
