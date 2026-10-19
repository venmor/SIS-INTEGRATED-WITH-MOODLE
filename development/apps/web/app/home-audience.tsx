"use client";

import { useState, useEffect } from "react";
import { SignInForm } from "./sign-in/form";
import styles from "./home.module.css";

type DemoAccount = { username: string; password: string; role: string; blurb: string; audience: "student" | "staff" };
export function HomeAudience({ returnTo, demoEnabled = false }: { returnTo?: string; demoEnabled?: boolean }) {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  useEffect(() => {
    if (!demoEnabled) return;
    const controller = new AbortController();
    fetch("/api/auth/demo-accounts", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : { accounts: [] })
      .then((body: { accounts?: DemoAccount[] }) => setAccounts(body.accounts ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [demoEnabled]);
  const [audience, setAudience] = useState<"student" | "staff">("staff");
  return (
    <div>
      <div className={styles.audience} role="group" aria-label="Account type">
        <button type="button" aria-pressed={audience === "student"} onClick={() => setAudience("student")}>Student</button>
        <button type="button" aria-pressed={audience === "staff"} onClick={() => setAudience("staff")}>Staff / Faculty</button>
      </div>
      <p className={styles.audienceHelp} role="status">
        {audience === "student" ? "Use your student or applicant SIS account." : "Use your assigned staff SIS account."} Your account determines the workspace after sign-in.
      </p>
      <SignInForm key={audience} home audience={audience} returnTo={returnTo} demoStaff={accounts.filter((account) => account.audience === audience)} />
    </div>
  );
}
