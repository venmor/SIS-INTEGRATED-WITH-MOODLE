import Link from "next/link";
import { ApplicantSignOut } from "./sign-out";
import styles from "./applicant.module.css";

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
          aria-label="Applicant navigation"
        >
          <Link
            className="inline-flex min-h-11 items-center rounded-sis px-3 font-semibold text-sis-muted no-underline transition-colors duration-150 hover:bg-sis-sunken hover:text-sis-text motion-reduce:transition-none"
            href="/applicant"
          >
            My applications
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-sis px-3 font-semibold text-sis-muted no-underline transition-colors duration-150 hover:bg-sis-sunken hover:text-sis-text motion-reduce:transition-none"
            href="/discover"
          >
            Find a programme
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-sis px-3 font-semibold text-sis-muted no-underline transition-colors duration-150 hover:bg-sis-sunken hover:text-sis-text motion-reduce:transition-none"
            href="/applicant/help"
          >
            Help
          </Link>
          <ApplicantSignOut />
        </nav>
      </header>
      <main id="applicant-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
