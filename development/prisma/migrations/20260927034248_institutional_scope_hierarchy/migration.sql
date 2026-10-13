-- AlterTable
ALTER TABLE "FinanceAdjustment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FinanceArrangement" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FinancePaymentRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FinanceSponsorship" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "IntegrationDeliveryAttempt" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "IntegrationIncident" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MoodleConnection" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MoodleMapping" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN     "scopeId" TEXT;

-- AlterTable
ALTER TABLE "SimStaffRole" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SimStudentEnrolment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TeachingAssignment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TutorialGroup" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scope" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentScopeId" TEXT,
    "capabilityId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityScope" (
    "capabilityId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapabilityScope_pkey" PRIMARY KEY ("capabilityId","scopeId")
);

-- CreateTable
CREATE TABLE "ApproverAuthority" (
    "id" TEXT NOT NULL,
    "approverRoleId" TEXT NOT NULL,
    "targetScopeId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApproverAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoDPair" (
    "id" TEXT NOT NULL,
    "roleAId" TEXT NOT NULL,
    "roleBId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoDPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Capability_name_key" ON "Capability"("name");

-- CreateIndex
CREATE INDEX "Capability_category_isActive_idx" ON "Capability"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Scope_name_key" ON "Scope"("name");

-- CreateIndex
CREATE INDEX "Scope_parentScopeId_idx" ON "Scope"("parentScopeId");

-- CreateIndex
CREATE INDEX "Scope_capabilityId_idx" ON "Scope"("capabilityId");

-- CreateIndex
CREATE INDEX "Scope_effectiveFrom_effectiveTo_idx" ON "Scope"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ApproverAuthority_approverRoleId_idx" ON "ApproverAuthority"("approverRoleId");

-- CreateIndex
CREATE INDEX "ApproverAuthority_targetScopeId_idx" ON "ApproverAuthority"("targetScopeId");

-- CreateIndex
CREATE UNIQUE INDEX "ApproverAuthority_approverRoleId_targetScopeId_capabilityId_key" ON "ApproverAuthority"("approverRoleId", "targetScopeId", "capabilityId");

-- CreateIndex
CREATE INDEX "SoDPair_roleAId_idx" ON "SoDPair"("roleAId");

-- CreateIndex
CREATE INDEX "SoDPair_roleBId_idx" ON "SoDPair"("roleBId");

-- CreateIndex
CREATE UNIQUE INDEX "SoDPair_roleAId_roleBId_key" ON "SoDPair"("roleAId", "roleBId");

-- CreateIndex
CREATE INDEX "RoleAssignment_scopeId_idx" ON "RoleAssignment"("scopeId");

-- RenameForeignKey
ALTER TABLE "FinanceAllocation" RENAME CONSTRAINT "FinanceAllocation_line_fkey" TO "FinanceAllocation_chargeLineId_fkey";

-- RenameForeignKey
ALTER TABLE "FinanceAllocation" RENAME CONSTRAINT "FinanceAllocation_tx_fkey" TO "FinanceAllocation_paymentTransactionId_fkey";

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scope" ADD CONSTRAINT "Scope_parentScopeId_fkey" FOREIGN KEY ("parentScopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scope" ADD CONSTRAINT "Scope_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapabilityScope" ADD CONSTRAINT "CapabilityScope_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapabilityScope" ADD CONSTRAINT "CapabilityScope_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApproverAuthority" ADD CONSTRAINT "ApproverAuthority_targetScopeId_fkey" FOREIGN KEY ("targetScopeId") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApproverAuthority" ADD CONSTRAINT "ApproverAuthority_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Application_state_created_idx" RENAME TO "Application_state_createdAt_idx";

-- RenameIndex
ALTER INDEX "Course_type_semester_idx" RENAME TO "Course_courseType_semester_idx";

-- RenameIndex
ALTER INDEX "CoursePlan_attempt_period_key" RENAME TO "CoursePlan_attemptId_periodId_key";

-- RenameIndex
ALTER INDEX "CoursePlan_attempt_status_idx" RENAME TO "CoursePlan_attemptId_status_idx";

-- RenameIndex
ALTER INDEX "CoursePlanItem_plan_course_key" RENAME TO "CoursePlanItem_planId_courseId_key";

-- RenameIndex
ALTER INDEX "CoursePlanItem_plan_status_idx" RENAME TO "CoursePlanItem_planId_status_idx";

-- RenameIndex
ALTER INDEX "CoursePrerequisite_course_requires_key" RENAME TO "CoursePrerequisite_courseId_requiresCourseId_key";

-- RenameIndex
ALTER INDEX "CourseRegistration_registration_course_key" RENAME TO "CourseRegistration_registrationId_courseId_key";

-- RenameIndex
ALTER INDEX "CourseRegistration_registration_status_idx" RENAME TO "CourseRegistration_registrationId_status_idx";

-- RenameIndex
ALTER INDEX "CurriculumCourse_curriculum_course_key" RENAME TO "CurriculumCourse_curriculumId_courseId_key";

-- RenameIndex
ALTER INDEX "CurriculumCourse_curriculum_required_idx" RENAME TO "CurriculumCourse_curriculumId_required_idx";

-- RenameIndex
ALTER INDEX "CurriculumVersion_programme_status_idx" RENAME TO "CurriculumVersion_programmeId_status_idx";

-- RenameIndex
ALTER INDEX "CurriculumVersion_programme_version_key" RENAME TO "CurriculumVersion_programmeId_version_key";

-- RenameIndex
ALTER INDEX "FinanceAdjustment_account_status_idx" RENAME TO "FinanceAdjustment_accountId_status_idx";

-- RenameIndex
ALTER INDEX "FinanceAllocation_account_idx" RENAME TO "FinanceAllocation_accountId_idx";

-- RenameIndex
ALTER INDEX "FinanceAllocation_line_idx" RENAME TO "FinanceAllocation_chargeLineId_idx";

-- RenameIndex
ALTER INDEX "FinanceAllocation_tx_line_key" RENAME TO "FinanceAllocation_paymentTransactionId_chargeLineId_key";

-- RenameIndex
ALTER INDEX "FinanceArrangement_account_status_idx" RENAME TO "FinanceArrangement_accountId_status_idx";

-- RenameIndex
ALTER INDEX "FinanceCallback_provider_ref_idx" RENAME TO "FinanceCallback_provider_providerRef_idx";

-- RenameIndex
ALTER INDEX "FinanceChargeLine_invoice_status_idx" RENAME TO "FinanceChargeLine_invoiceId_status_idx";

-- RenameIndex
ALTER INDEX "FinanceClearance_student_period_key" RENAME TO "FinanceClearance_studentId_periodId_key";

-- RenameIndex
ALTER INDEX "FinanceClearance_student_status_idx" RENAME TO "FinanceClearance_studentId_status_idx";

-- RenameIndex
ALTER INDEX "FinanceInvoice_account_period_key" RENAME TO "FinanceInvoice_accountId_periodId_key";

-- RenameIndex
ALTER INDEX "FinanceInvoice_account_status_idx" RENAME TO "FinanceInvoice_accountId_status_idx";

-- RenameIndex
ALTER INDEX "FinancePaymentRequest_account_status_idx" RENAME TO "FinancePaymentRequest_accountId_status_idx";

-- RenameIndex
ALTER INDEX "FinancePaymentRequest_invoice_status_idx" RENAME TO "FinancePaymentRequest_invoiceId_status_idx";

-- RenameIndex
ALTER INDEX "FinancePaymentTransaction_account_status_idx" RENAME TO "FinancePaymentTransaction_accountId_status_idx";

-- RenameIndex
ALTER INDEX "FinanceReconciliationCase_account_status_idx" RENAME TO "FinanceReconciliationCase_accountId_status_idx";

-- RenameIndex
ALTER INDEX "FinanceReconciliationCase_status_created_idx" RENAME TO "FinanceReconciliationCase_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "FinanceSponsorship_account_status_idx" RENAME TO "FinanceSponsorship_accountId_status_idx";

-- RenameIndex
ALTER INDEX "Hold_student_status_idx" RENAME TO "Hold_studentId_status_idx";

-- RenameIndex
ALTER INDEX "IdentityMatchCandidate_application_person_candidate_key" RENAME TO "IdentityMatchCandidate_applicationId_personId_candidatePers_key";

-- RenameIndex
ALTER INDEX "IdentityMatchCandidate_application_status_idx" RENAME TO "IdentityMatchCandidate_applicationId_status_idx";

-- RenameIndex
ALTER INDEX "InstitutionalRegistration_attempt_period_key" RENAME TO "InstitutionalRegistration_attemptId_periodId_key";

-- RenameIndex
ALTER INDEX "InstitutionalRegistration_attempt_status_idx" RENAME TO "InstitutionalRegistration_attemptId_status_idx";

-- RenameIndex
ALTER INDEX "IntegrationDeliveryAttempt_outbox_idx" RENAME TO "IntegrationDeliveryAttempt_outboxId_idx";

-- RenameIndex
ALTER INDEX "IntegrationDeliveryAttempt_state_next_idx" RENAME TO "IntegrationDeliveryAttempt_state_nextRunAt_idx";

-- RenameIndex
ALTER INDEX "IntegrationIncident_status_created_idx" RENAME TO "IntegrationIncident_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "MappingCheck_mapping_created_idx" RENAME TO "MappingCheck_mappingId_createdAt_idx";

-- RenameIndex
ALTER INDEX "MoodleMaintenance_status_starts_idx" RENAME TO "MoodleMaintenance_status_startsAt_idx";

-- RenameIndex
ALTER INDEX "MoodleMapping_kind_sis_status_idx" RENAME TO "MoodleMapping_kind_sisType_sisId_status_idx";

-- RenameIndex
ALTER INDEX "MoodleMapping_status_updated_idx" RENAME TO "MoodleMapping_status_updatedAt_idx";

-- RenameIndex
ALTER INDEX "OnboardingTask_application_status_idx" RENAME TO "OnboardingTask_applicationId_status_idx";

-- RenameIndex
ALTER INDEX "OnboardingTask_application_task_key" RENAME TO "OnboardingTask_applicationId_taskKey_key";

-- RenameIndex
ALTER INDEX "ProgrammeAttempt_student_status_idx" RENAME TO "ProgrammeAttempt_studentId_status_idx";

-- RenameIndex
ALTER INDEX "ReconciliationCase_student_status_idx" RENAME TO "ReconciliationCase_studentId_status_idx";

-- RenameIndex
ALTER INDEX "ReconciliationRun_status_started_idx" RENAME TO "ReconciliationRun_status_startedAt_idx";

-- RenameIndex
ALTER INDEX "RegistrationAmendment_registration_status_idx" RENAME TO "RegistrationAmendment_registrationId_status_idx";

-- RenameIndex
ALTER INDEX "ReplayDecision_status_created_idx" RENAME TO "ReplayDecision_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "ReviewAssignment_assignee_status_idx" RENAME TO "ReviewAssignment_assigneeAccountId_status_idx";

-- RenameIndex
ALTER INDEX "ReviewAssignment_status_app_idx" RENAME TO "ReviewAssignment_status_applicationId_idx";

-- RenameIndex
ALTER INDEX "ReviewFinding_application_status_idx" RENAME TO "ReviewFinding_applicationId_status_idx";

-- RenameIndex
ALTER INDEX "ReviewRecommendation_application_status_idx" RENAME TO "ReviewRecommendation_applicationId_status_idx";

-- RenameIndex
ALTER INDEX "SimGroupMember_group_status_idx" RENAME TO "SimGroupMember_groupId_status_idx";

-- RenameIndex
ALTER INDEX "SimGroupMember_shell_group_student_key" RENAME TO "SimGroupMember_shellId_groupId_studentId_key";

-- RenameIndex
ALTER INDEX "SimShell_offering_period_key" RENAME TO "SimShell_offeringId_periodId_key";

-- RenameIndex
ALTER INDEX "SimStaffRole_account_status_idx" RENAME TO "SimStaffRole_accountId_status_idx";

-- RenameIndex
ALTER INDEX "SimStaffRole_shell_account_key" RENAME TO "SimStaffRole_shellId_accountId_key";

-- RenameIndex
ALTER INDEX "SimStudentEnrolment_shell_student_key" RENAME TO "SimStudentEnrolment_shellId_studentId_key";

-- RenameIndex
ALTER INDEX "SimStudentEnrolment_student_status_idx" RENAME TO "SimStudentEnrolment_studentId_status_idx";

-- RenameIndex
ALTER INDEX "StudentCorrectionRequest_student_status_idx" RENAME TO "StudentCorrectionRequest_studentId_status_idx";

-- RenameIndex
ALTER INDEX "TGAllocation_group_status_idx" RENAME TO "TGAllocation_groupId_status_idx";

-- RenameIndex
ALTER INDEX "TGAllocation_group_student_key" RENAME TO "TGAllocation_groupId_studentId_key";

-- RenameIndex
ALTER INDEX "TGAllocation_student_status_idx" RENAME TO "TGAllocation_studentId_status_idx";

-- RenameIndex
ALTER INDEX "TeachingAssignment_account_status_idx" RENAME TO "TeachingAssignment_accountId_status_idx";

-- RenameIndex
ALTER INDEX "TeachingAssignment_group_status_idx" RENAME TO "TeachingAssignment_groupId_status_idx";

-- RenameIndex
ALTER INDEX "TutorialGroup_offering_name_key" RENAME TO "TutorialGroup_offeringId_name_key";

-- RenameIndex
ALTER INDEX "TutorialGroup_offering_status_idx" RENAME TO "TutorialGroup_offeringId_status_idx";

-- RenameIndex
ALTER INDEX "WaitlistEntry_attempt_period_course_key" RENAME TO "WaitlistEntry_attemptId_periodId_courseId_key";

-- RenameIndex
ALTER INDEX "WaitlistEntry_course_status_idx" RENAME TO "WaitlistEntry_courseId_status_idx";
