"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseAcademicContext } from "../../lib/academic-context";
import { NavigationIcon } from "../navigation-icon";
import styles from "./student-shell.module.css";

const navigation = [
  { href: "/student", label: "Home" },
  { href: "/student/readiness", label: "Registration" },
  { href: "/student/courses", label: "My studies" },
  { href: "/student/timetable", label: "My timetable" },
  { href: "/student/finance", label: "Finance" },
  { href: "/student/results", label: "Results" },
  { href: "/student/support", label: "Requests and support" },
  { href: "/notifications", label: "Notifications" },
];
const academicRoutes = new Set([
  "/student/readiness",
  "/student/courses",
  "/student/register",
  "/student/timetable",
]);

export function StudentNavigation() {
  const pathname = usePathname();
  const search = useSearchParams();
  const mobile = useRef<HTMLDetailsElement>(null);
  const parsed = parseAcademicContext({
    attemptId:
      search.getAll("attemptId").length > 1
        ? search.getAll("attemptId")
        : (search.get("attemptId") ?? undefined),
    period:
      search.getAll("period").length > 1
        ? search.getAll("period")
        : (search.get("period") ?? undefined),
  });
  // An invoice period is a different source context. Do not forward it as an
  // academic registration selection when leaving the finance area.
  const preserve = parsed.valid && !pathname.startsWith("/student/finance");
  useEffect(() => {
    if (mobile.current) mobile.current.open = false;
  }, [pathname]);
  const links = navigation.map((item) => {
    const current =
      pathname === item.href ||
      (item.href !== "/student" && pathname.startsWith(`${item.href}/`)) ||
      (item.href === "/student/readiness" &&
        pathname === "/student/register") ||
      (item.href === "/student/courses" && pathname === "/student/changes");
    const href =
      preserve && academicRoutes.has(item.href) && parsed.query.size
        ? `${item.href}?${parsed.query}`
        : item.href;
    return (
      <Link
        key={item.href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={current ? styles.current : undefined}
      >
        <NavigationIcon href={item.href} />
        <span>{item.label}</span>
      </Link>
    );
  });
  return (
    <>
      <div
        className={styles.desktopMenu}
        role="region"
        aria-label="Student navigation scroll area"
        tabIndex={0}
      >
        <nav className={styles.navigation} aria-label="Student navigation">
          {links}
        </nav>
      </div>
      <details
        ref={mobile}
        className={styles.mobileMenu}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>Portal sections</summary>
        <nav className={styles.navigation} aria-label="Student navigation">
          {links}
        </nav>
      </details>
    </>
  );
}

export function StudentScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    document
      .getElementById("main-content")
      ?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
