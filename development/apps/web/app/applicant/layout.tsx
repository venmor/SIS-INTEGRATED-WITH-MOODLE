import Link from "next/link";
import { ApplicantSignOut } from "./sign-out";
import styles from "./applicant.module.css";
import { PortalNav } from "../portal-nav";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Applicant portal",
  robots: { index: false, follow: false },
};

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#applicant-content">
        Skip to application content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-sis-border py-4 sm:py-5">
        <Link
          href="/applicant"
          className="group flex min-h-11 items-center gap-3 text-sis-text no-underline"
        >
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-sis bg-sis-brand-strong text-sm font-bold tracking-wide text-white"
          >
            SIS
          </span>
          <span className="flex flex-col leading-tight">
            <strong className="text-base tracking-tight">
              Applicant portal
            </strong>
            <span className="text-xs font-medium text-sis-muted">
              Applications and admissions
            </span>
          </span>
        </Link>
        <nav
          className="flex w-full flex-wrap items-center gap-1 sm:w-auto"
          aria-label="Applicant account"
        >
          <Link href="/">Switch workspace</Link>
          <ApplicantSignOut />
        </nav>
      </header>
      <PortalNav
        label="Applicant navigation"
        links={[
          { href: "/applicant", label: "My applications" },
          { href: "/discover", label: "Find a programme" },
          { href: "/applicant/notifications", label: "Notifications" },
          { href: "/applicant/help", label: "Help" },
        ]}
      />
      <main id="applicant-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
