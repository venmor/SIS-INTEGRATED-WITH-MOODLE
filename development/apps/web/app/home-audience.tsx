"use client";

import { useState } from "react";
import styles from "./home.module.css";

export function HomeAudience() {
  const [audience, setAudience] = useState<"student" | "staff">("staff");
  return (
    <div>
      <div className={styles.audience} role="group" aria-label="Account type">
        <button type="button" aria-pressed={audience === "student"} onClick={() => setAudience("student")}>Student</button>
        <button type="button" aria-pressed={audience === "staff"} onClick={() => setAudience("staff")}>Staff / Faculty</button>
      </div>
      <p className={styles.audienceHelp} role="status">
        {audience === "student" ? "Use your student SIS account." : "Use your assigned staff SIS account."} Your account determines the workspace after sign-in.
      </p>
    </div>
  );
}
