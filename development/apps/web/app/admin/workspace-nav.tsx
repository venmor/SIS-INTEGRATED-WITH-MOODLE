"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-shell.module.css";

export interface WorkspaceLink {
  href: string;
  label: string;
}

export function WorkspaceNav({ items }: { items: WorkspaceLink[] }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Workspace sections">
      {items.map((item) => {
        const current =
          pathname === item.href ||
          (item.href !== "/" &&
            pathname.startsWith(`${item.href}/`) &&
            !items.some(
              (other) =>
                other.href !== item.href &&
                other.href.startsWith(`${item.href}/`) &&
                (pathname === other.href ||
                  pathname.startsWith(`${other.href}/`)),
            ));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={current ? styles.current : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
