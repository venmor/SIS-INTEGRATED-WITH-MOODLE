import Link from "next/link";
import shell from "./student-shell.module.css";
import { PortalNav } from "../portal-nav";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Student portal",
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/student", label: "Home" },
  { href: "/student/readiness", label: "Registration" },
  { href: "/student/courses", label: "My studies" },
  { href: "/student/timetable", label: "My timetable" },
  { href: "/student/finance", label: "Finance" },
  { href: "/student/results", label: "Results" },
  { href: "/student/support", label: "Requests and support" },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={shell.shell}>
      <header className={shell.header}>
        <Link
          href="/student"
          className={`${shell.brand} flex min-h-11 items-center gap-3 no-underline`}
        >
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-sis bg-sis-brand-strong text-sm font-bold tracking-wide text-white"
          >
            SIS
          </span>
          <span className="flex flex-col leading-tight">
            <strong className="text-base tracking-tight">Student portal</strong>
            <span className="text-xs font-medium text-sis-muted">
              Study and student services
            </span>
          </span>
        </Link>
        <nav className={shell.account} aria-label="Student account">
          <Link
            href="/"
            className={`${shell.switch} inline-flex min-h-11 items-center rounded-sis px-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none`}
          >
            Switch workspace
          </Link>
          <Link href="/sign-in" className={shell.switch}>
            Switch account
          </Link>
        </nav>
      </header>
      <PortalNav label="Student navigation" links={navigation} />
      <main id="main-content" tabIndex={-1} className={shell.main}>
        {children}
      </main>
    </div>
  );
}
