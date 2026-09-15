import { cookies } from "next/headers";
import { Status } from "@sis/ui";
import { formatLusaka } from "../lib/time";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function signedInAccount(): Promise<string | null> {
  const sid = (await cookies()).get("sid")?.value;
  if (!sid) return null;
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  try {
    const res = await fetch(`${api}/auth/me`, {
      headers: { cookie: `sid=${sid}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { account?: { displayName?: string } };
    return body.account?.displayName ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const displayName = await signedInAccount();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.context}>Implementation shell · Phase 0</p>
        <h1 className={styles.title}>Student Information System</h1>
        <p className={styles.lede}>
          UNZA student lifecycle coordination, integrated with Moodle. This
          shell proves the interface baseline renders — no business feature
          lives here yet.
        </p>
        {displayName ? (
          <Status
            severity="success"
            state={`Signed in as ${displayName}`}
            reason="Your session is active on this device."
            updated={formatLusaka(new Date())}
            action="Workspace switching arrives with the roles slice."
          />
        ) : (
          <Status
            severity="info"
            state="Shell running — no business data"
            reason="Interface, API liveness and design tokens are in place. Applicant, registration and result workflows arrive in later slices."
            updated="Phase 0, slice 4"
            action="Next: sign in, then continue to the roles slice."
          />
        )}
        <div className={styles.actions}>
          {displayName ? (
            <a className={styles.primary} href="/sign-in">
              Switch account
            </a>
          ) : (
            <a className={styles.primary} href="/sign-in">
              Sign in
            </a>
          )}
        </div>
        <p className={styles.supporting}>
          Expected API shape:{" "}
          <code className={styles.code}>
            {"{ status: 'ok', version: '0.1.0' }"}
          </code>
          . Colours are a proposed palette and require institutional approval.
        </p>
      </main>
    </div>
  );
}
