-- TASK-PH2-006: admit the Withdrawn post-submit state. The active-slot
-- unique index intentionally still counts Withdrawn (like Submitted):
-- withdrawing does not free re-application; that rule is unspecified, so
-- fail-closed against duplicate active applications.
ALTER TABLE "Application" DROP CONSTRAINT "Application_state_check";
ALTER TABLE "Application" ADD CONSTRAINT "Application_state_check" CHECK ("state" IN ('Created','InProgress','ReadyForReview','Submitted','Discarded','Withdrawn'));
