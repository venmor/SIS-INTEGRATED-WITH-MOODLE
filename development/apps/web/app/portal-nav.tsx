"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./portal-nav.module.css";

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
  const content = links.map(({ href, label: itemLabel }) => {
    const current =
      pathname === href ||
      (href !== "/student" &&
        href !== "/applicant" &&
        pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        aria-current={current ? "page" : undefined}
        className={current ? styles.current : undefined}
      >
        {itemLabel}
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
