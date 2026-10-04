import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { RouteFocus } from "./route-focus";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        <a className="globalSkip" href="#main-content">
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <RouteFocus />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
