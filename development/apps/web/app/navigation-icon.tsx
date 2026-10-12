/** Decorative route cue; adjacent visible text is always the link label. */
export function NavigationIcon({ href }: { href: string }) {
  let path = "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9";
  if (/timetable|calendar/.test(href))
    path = "M5 5h14v16H5zM8 3v4m8-4v4M5 10h14M8 14h2m4 0h2m-8 3h2";
  else if (/courses|studies|programme/.test(href))
    path =
      "M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1m0-15c3-2 7-2 9-1v15c-3-1-6-1-9 1V5";
  else if (/finance|payment|cashier/.test(href))
    path = "M3 5h18v14H3zM3 9h18m-6 6h3";
  else if (/results|assessment/.test(href))
    path = "M6 3h12v18H6zM9 7h6m-6 4h6m-6 4 2 2 4-4";
  else if (/support|request|ticket/.test(href))
    path = "M4 4h16v12H9l-5 4V4m4 5h8m-8 3h5";
  else if (/readiness|register|application/.test(href))
    path = "M8 4H5v17h14V4h-3M8 3h8v4H8zM8 12l2 2 5-5m-7 9h8";
  else if (/documents/.test(href))
    path = "M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6";
  else if (/profile|account|personal/.test(href))
    path = "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
