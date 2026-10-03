import Link from "next/link";
import shell from "./student-shell.module.css";

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
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 text-sis-text sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sis-border py-4 sm:py-5">
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
        <Link
          href="/"
          className={`${shell.switch} inline-flex min-h-11 items-center rounded-sis px-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none`}
        >
          Switch workspace
        </Link>
      </header>
      <nav
        aria-label="Student navigation"
        className="flex flex-wrap gap-1 border-b border-sis-border py-2"
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${shell.navLink} inline-flex min-h-11 items-center text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-w-0 flex-col gap-6 pt-8 sm:gap-8 sm:pt-10"
      >
        {children}
      </main>
    </div>
  );
}
