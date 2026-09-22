import type { OnboardingView } from "@sis/contracts";
import { loadApplicant } from "../../server";
import { ApplicationCaseNav } from "../../chrome";
import { Notice } from "@sis/ui";
import { OnboardingTasks } from "./onboarding-tasks";
import styles from "../../applicant.module.css";

// Onboarding tasks: visible only after an accepted offer. Applicant-owned
// tasks complete here; institution-owned tasks show who is responsible.
// Nothing here creates a student record.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await loadApplicant<OnboardingView>(
    `/${id}/onboarding`,
    `/applicant/${id}/onboarding`,
  );
  if (!r.data) {
    return (
      <>
        <p className={styles.eyebrow}>Submitted application</p>
        <h1>Onboarding tasks</h1>
        <Notice
          severity="info"
          title="No onboarding tasks"
          message="Onboarding tasks appear after an accepted admission offer."
        />
        <ApplicationCaseNav applicationId={id} />
      </>
    );
  }
  const board = r.data;
  return (
    <>
      <p className={styles.eyebrow}>Accepted applicant onboarding</p>
      <h1>Onboarding tasks</h1>
      <OnboardingTasks applicationId={id} initial={board.tasks} />
      <ApplicationCaseNav applicationId={id} />
    </>
  );
}
