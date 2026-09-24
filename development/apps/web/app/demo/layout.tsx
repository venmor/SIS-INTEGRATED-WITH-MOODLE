import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./demo.module.css";

export const dynamic = "force-dynamic";

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.DEMO_MODE !== "true") notFound();

  return (
    <div className={styles.shell}>
      <header className={styles.banner}>
        <div>
          <strong>Demonstration environment · fictional records</strong>
          <span>Phase-6 live journeys with later phases clearly marked as previews.</span>
        </div>
        <nav aria-label="Demo navigation">
          <Link href="/demo">Control centre</Link>
          <Link href="/demo/stories">Story notes</Link>
          <Link href="/demo/evidence">Evidence</Link>
          <Link href="/">Application</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
