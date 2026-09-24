import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "applicant"
  | "home"
  | "courses"
  | "readiness"
  | "registration"
  | "changes"
  | "finance"
  | "admissions"
  | "identity"
  | "teaching"
  | "moodle"
  | "mappings"
  | "maintenance"
  | "integration"
  | "reconciliation"
  | "reviews"
  | "roles"
  | "audit"
  | "alert"
  | "check"
  | "receipt"
  | "wallet"
  | "arrowRight";

const paths: Record<IconName, ReactNode> = {
  applicant: <><circle cx="12" cy="8" r="3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 4h4v4" /></>,
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-5h5v5" /></>,
  courses: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 5.5v15M8 7h8" /></>,
  readiness: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8.5" /></>,
  registration: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 2v4M16 2v4M8 10h8M8 14h5" /></>,
  changes: <><path d="M7 7h11l-3-3M18 7l-3 3M17 17H6l3 3M6 17l3-3" /></>,
  finance: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  admissions: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5M9 2h6v4H9z" /></>,
  identity: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4M14 14h4" /></>,
  teaching: <><path d="M3 6.5 12 3l9 3.5-9 3.5zM6 8.5V14c2.5 2 9.5 2 12 0V8.5M21 7v7" /></>,
  moodle: <><path d="M4 7.5 12 4l8 3.5-8 3.5zM7 10v5c2 1.7 8 1.7 10 0v-5M20 8v6" /></>,
  mappings: <><rect x="3" y="4" width="7" height="6" rx="1.5" /><rect x="14" y="14" width="7" height="6" rx="1.5" /><path d="M10 7h3a4 4 0 0 1 4 4v3m-3-3 3 3 3-3" /></>,
  maintenance: <><path d="m14.5 6.5 3-3 3 3-3 3m-8 8-3 3-3-3 3-3M8 8a6 6 0 0 1 9.5-1.5M16 16a6 6 0 0 1-9.5 1.5" /></>,
  integration: <><path d="M8 8h8v8H8zM12 3v5M12 16v5M3 12h5M16 12h5m-13.5-6.5 3 3m7 7 3 3m0-13-3 3m-7 7-3 3" /></>,
  reconciliation: <><path d="M4 8h12l-3-3m3 3-3 3M20 16H8l3 3m-3-3 3-3" /></>,
  reviews: <><path d="M4 4h12v16H4zM8 8h4M8 12h4M8 16h4m5-1 2 2 3-4" /></>,
  roles: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20a5 5 0 0 1 10 0M13 20a4 4 0 0 1 8 0" /></>,
  audit: <><circle cx="11" cy="11" r="7" /><path d="M11 7v4l3 2m2.5 3.5 4 4" /></>,
  alert: <><path d="M12 3 2.8 20h18.4zM12 9v4M12 17h.01" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8.5" /></>,
  receipt: <><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6M9 16h4" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2zM4 8V6a2 2 0 0 1 2-2h10v4M15 12h5v4h-5a2 2 0 0 1 0-4z" /></>,
  arrowRight: <path d="M5 12h14m-5-5 5 5-5 5" />,
};

export function Icon({
  name,
  size = 18,
  ...props
}: {
  name: IconName;
  size?: number;
} & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
