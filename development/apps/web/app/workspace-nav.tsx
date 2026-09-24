import Link from "next/link";
import styles from "./workspace-nav.module.css";

export interface WorkspaceNavItem {
  href: string;
  label: string;
  roles: readonly string[];
}

export const workspaceNavItems: readonly WorkspaceNavItem[] = [
  {
    href: "/applicant",
    label: "Applicant portal",
    roles: ["APPLICANT", "APP"],
  },
  {
    href: "/student",
    label: "Student home",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/courses",
    label: "Courses",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/readiness",
    label: "Readiness",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/register",
    label: "Registration",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/changes",
    label: "Course changes",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/finance",
    label: "Finance",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/admin/admissions/queue",
    label: "Admissions",
    roles: ["ADMISSIONS_OFFICER", "ADMISSIONS_APPROVER"],
  },
  {
    href: "/admin/records/duplicates",
    label: "Identity review",
    roles: ["RECORDS_OFFICER"],
  },
  {
    href: "/admin/finance",
    label: "Finance workspace",
    roles: ["FINANCE_OFFICER", "FINANCE_APPROVER"],
  },
  {
    href: "/admin/teaching/groups",
    label: "Teaching groups",
    roles: ["COORDINATOR"],
  },
  {
    href: "/admin/moodle",
    label: "Moodle",
    roles: ["MOODLE_ADMIN"],
  },
  {
    href: "/admin/moodle/mappings",
    label: "Mappings",
    roles: ["MOODLE_ADMIN"],
  },
  {
    href: "/admin/moodle/maintenance",
    label: "Maintenance",
    roles: ["MOODLE_ADMIN"],
  },
  {
    href: "/admin/integration",
    label: "Integration",
    roles: ["INTEGRATION_SUPPORT"],
  },
  {
    href: "/admin/integration/reconciliation",
    label: "Reconciliation",
    roles: ["INTEGRATION_SUPPORT"],
  },
  {
    href: "/admin/reviews",
    label: "Access reviews",
    roles: ["SYSADMIN"],
  },
  {
    href: "/admin/grants",
    label: "Role assignments",
    roles: ["SYSADMIN"],
  },
  {
    href: "/admin/audit",
    label: "Audit trail",
    roles: ["SYSADMIN"],
  },
];

export function getWorkspaceNavItems(role: string | null | undefined) {
  if (!role) return [];
  return workspaceNavItems.filter((item) => item.roles.includes(role));
}

export function WorkspaceNav({
  role,
  variant = "bar",
}: {
  role: string | null | undefined;
  variant?: "bar" | "sidebar";
}) {
  const items = getWorkspaceNavItems(role);
  if (items.length === 0) return null;

  return (
    <nav
      className={styles.nav}
      data-variant={variant}
      aria-label="Workspace navigation"
    >
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
