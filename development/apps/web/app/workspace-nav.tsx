import Link from "next/link";
import { Icon, type IconName } from "@sis/ui";
import styles from "./workspace-nav.module.css";

export interface WorkspaceNavItem {
  href: string;
  label: string;
  roles: readonly string[];
  icon: IconName;
}

export const workspaceNavItems: readonly WorkspaceNavItem[] = [
  {
    href: "/applicant",
    label: "Applicant portal",
    icon: "applicant",
    roles: ["APPLICANT", "APP"],
  },
  {
    href: "/student",
    label: "Student home",
    icon: "home",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/courses",
    label: "Courses",
    icon: "courses",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/readiness",
    label: "Readiness",
    icon: "readiness",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/register",
    label: "Registration",
    icon: "registration",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/changes",
    label: "Course changes",
    icon: "changes",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/student/finance",
    label: "Finance",
    icon: "finance",
    roles: ["STUDENT", "STU"],
  },
  {
    href: "/admin/admissions/queue",
    label: "Admissions",
    icon: "admissions",
    roles: ["ADMISSIONS_OFFICER", "ADMISSIONS_APPROVER"],
  },
  {
    href: "/admin/records/duplicates",
    label: "Identity review",
    icon: "identity",
    roles: ["RECORDS_OFFICER"],
  },
  {
    href: "/admin/finance",
    label: "Finance workspace",
    icon: "finance",
    roles: ["FINANCE_OFFICER", "FINANCE_APPROVER"],
  },
  {
    href: "/admin/teaching/groups",
    label: "Teaching groups",
    icon: "teaching",
    roles: ["COORDINATOR"],
  },
  {
    href: "/admin/moodle",
    label: "Moodle",
    icon: "moodle",
    roles: ["MOODLE_ADMIN"],
  },
  {
    href: "/admin/moodle/mappings",
    label: "Mappings",
    icon: "mappings",
    roles: ["MOODLE_ADMIN"],
  },
  {
    href: "/admin/moodle/maintenance",
    label: "Maintenance",
    icon: "maintenance",
    roles: ["MOODLE_ADMIN"],
  },
  {
    href: "/admin/integration",
    label: "Integration",
    icon: "integration",
    roles: ["INTEGRATION_SUPPORT"],
  },
  {
    href: "/admin/integration/reconciliation",
    label: "Reconciliation",
    icon: "reconciliation",
    roles: ["INTEGRATION_SUPPORT"],
  },
  {
    href: "/admin/reviews",
    label: "Access reviews",
    icon: "reviews",
    roles: ["SYSADMIN"],
  },
  {
    href: "/admin/grants",
    label: "Role assignments",
    icon: "roles",
    roles: ["SYSADMIN"],
  },
  {
    href: "/admin/audit",
    label: "Audit trail",
    icon: "audit",
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
          <Icon name={item.icon} size={17} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
