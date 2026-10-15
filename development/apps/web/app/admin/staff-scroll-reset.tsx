"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
/** App Router resets the document scroll. Staff pages scroll their own viewport. */
export function StaffScrollReset() {
  const pathname = usePathname();
  useEffect(() => {
    document
      .getElementById("main-content")
      ?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
