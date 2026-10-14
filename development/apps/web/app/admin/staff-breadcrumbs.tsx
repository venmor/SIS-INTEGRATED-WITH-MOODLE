"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationIcon } from "../navigation-icon";
import type { WorkspaceLink } from "./workspace-nav";
import styles from "./admin-shell.module.css";

/** Breadcrumb ancestors are actual visible destinations, never sibling tasks
 * or raw record identifiers copied from a private URL. */
export function StaffBreadcrumbs({ items }: { items: WorkspaceLink[] }) {
  const pathname = usePathname();
  const ancestors = items
    .filter(
      (item) =>
        item.href !== "/" &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => a.href.length - b.href.length);
  const parent = ancestors.at(-1);
  const deep = parent && pathname !== parent.href;
  const recordLabel = parent?.href.includes("/batches")
    ? "Batch details"
    : parent?.href.includes("/plans")
      ? "Plan details"
      : parent?.href.includes("/mappings")
        ? "Mapping details"
        : parent?.href.includes("/queue")
          ? "Case details"
          : "Record details";
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol>
        <li>
          <Link href="/">
            <NavigationIcon href="/" />
            <span>Workspace home</span>
          </Link>
        </li>
        {ancestors.map((item, index) => (
          <li key={item.href}>
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              /
            </span>
            {index === ancestors.length - 1 && !deep ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </li>
        ))}
        {deep || !parent ? (
          <li>
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              /
            </span>
            <span aria-current="page">
              {deep ? recordLabel : "Workspace page"}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
