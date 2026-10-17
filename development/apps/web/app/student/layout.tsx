import Link from "next/link";
import { cookies } from "next/headers";
import shell from "./student-shell.module.css";
import { StudentNavigation, StudentScrollReset } from "./student-navigation";
import { NavigationIcon } from "../navigation-icon";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Student portal",
  robots: { index: false, follow: false },
};

async function studentIdentity(): Promise<string | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://localhost:3001"}/auth/me`,
      {
        headers: { cookie: `sid=${encodeURIComponent(sid)}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return null;
    const me = (await response.json()) as {
      account?: { displayName?: unknown };
      activeWorkspace?: { role?: unknown };
    };
    return me.activeWorkspace?.role === "STUDENT" &&
      typeof me.account?.displayName === "string" &&
      me.account.displayName.trim()
      ? me.account.displayName
      : null;
  } catch {
    return null;
  }
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const name = await studentIdentity();
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("en") || "SIS";
  return (
    <div className={shell.shell}>
      <aside
        className={shell.sidebar}
        aria-label="Student workspace navigation"
      >
        <Link href="/student" className={shell.brand}>
          <span className={shell.brandMark} aria-hidden="true">
            SIS
          </span>
          <span>
            <strong>Student portal</strong>
            <small>Student Information System</small>
          </span>
        </Link>
        <div className={shell.workspaceLabel}>
          <NavigationIcon href="/student/courses" />
          <span>
            <strong>Your study workspace</strong>
            <small>Studies and student services</small>
          </span>
        </div>
        <StudentNavigation />
        <div className={shell.account}>
          <span className={shell.avatar} aria-hidden="true">
            {initials}
          </span>
          <div className={shell.accountIdentity}>
            <span className={shell.accountCaption}>Current account</span>
            <strong>{name ?? "Account unavailable"}</strong>
            <Link href="/sign-in">Switch account</Link>
          </div>
        </div>
      </aside>
      <div className={shell.content}>
        <header className={shell.topbar}>
          <div className={shell.topbarIdentity}>
            <span>Current workspace</span>
            <strong>Student portal</strong>
          </div>
          <Link href="/workspaces" className={shell.switch}>
            <NavigationIcon href="/workspaces" />
            Switch workspace
          </Link>
        </header>
        <main id="main-content" tabIndex={-1} className={shell.main}>
          <StudentScrollReset />
          <div className={shell.page}>{children}</div>
        </main>
      </div>
    </div>
  );
}
