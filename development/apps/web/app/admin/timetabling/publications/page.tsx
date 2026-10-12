import { cookies } from "next/headers";
import { Notice } from "@sis/ui";
import type { MasterDraft, Catalogue } from "../master/planner";
import { PublicationReview } from "./review";

export const dynamic = "force-dynamic";

export default async function TimetablePublicationsPage() {
  const sid = (await cookies()).get("sid")?.value;
  let actorRef = "";
  let history: MasterDraft[] | null = null;
  let olderVersionCursor: number | null = null;
  let initialPeriodId = "";
  let periods: Catalogue["periods"] = [];
  if (sid) {
    try {
      const api = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
      const headers = { cookie: `sid=${encodeURIComponent(sid)}` };
      const [drafts, catalogue, identity] = await Promise.all([
        fetch(`${api}/timetabling/demo-master`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
        fetch(`${api}/timetabling/demo-master/catalogue`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
        fetch(`${api}/auth/me`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        }),
      ]);
      if (drafts.ok && catalogue.ok && identity.ok) {
        const me = (await identity.json()) as {
          account: { accountId: string };
          activeWorkspace: { assignmentId: string } | null;
        };
        if (!me.account.accountId || !me.activeWorkspace?.assignmentId)
          throw new Error("Workspace unavailable.");
        actorRef = `${me.account.accountId}:${me.activeWorkspace.assignmentId}`;
        const newest = (await drafts.json()) as MasterDraft[];
        periods = ((await catalogue.json()) as Catalogue).periods;
        initialPeriodId = newest[0]?.periodId ?? periods[0]?.id ?? "";
        if (initialPeriodId) {
          const saved = await fetch(
            `${api}/timetabling/demo-master/draft-history?periodId=${encodeURIComponent(initialPeriodId)}`,
            {
              headers,
              cache: "no-store",
              signal: AbortSignal.timeout(10000),
            },
          );
          if (saved.ok) {
            const result = (await saved.json()) as {
              items: MasterDraft[];
              olderVersionCursor: number | null;
            };
            history = result.items;
            olderVersionCursor = result.olderVersionCursor;
          }
        } else history = [];
      }
    } catch {
      /* No draft disclosure on failed authority/service reads. */
    }
  }
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-sm font-semibold text-muted">
          Academic delivery · fictional rehearsal
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Timetable publication
        </h1>
        <p className="text-muted">
          Review the saved master and changes before independent approval.
        </p>
      </header>
      {history === null ? (
        <Notice
          severity="warning"
          title="Publication workspace unavailable"
          message="Use an active fictional timetable appointment. Check your workspace or try again."
          action={{ label: "Workspace home", href: "/" }}
        />
      ) : (
        <PublicationReview
          initialDrafts={history}
          periods={periods}
          initialPeriodId={initialPeriodId}
          initialOlderVersionCursor={olderVersionCursor}
          actorRef={actorRef}
        />
      )}
    </div>
  );
}
