import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";
import { RouteFocus } from "./route-focus";
import { SkipToMain } from "./skip-to-main";

// Use the Latin Geist files bundled with this locked Next.js version so local
// builds do not fetch Google Fonts on limited-data development connections.
const geistSans = localFont({
  src: "../../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../../../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SIS · Admissions and student services",
  description:
    "Student Information System — programme discovery and applicant self-service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SkipToMain />
        <Suspense fallback={null}>
          <RouteFocus />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
