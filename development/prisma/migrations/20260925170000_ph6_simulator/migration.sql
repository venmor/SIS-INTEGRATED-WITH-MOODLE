-- TASK-PH6-003: simulator actual-state projections. MOODLE-SIM-v1
-- holds shells, enrolments and group mirrors; SIS rows are expected.
-- Removals suspend, never delete.
CREATE TABLE "SimShell" (
    "id" TEXT NOT NULL,
    "shellRef" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimShell_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SimShell_shellRef_key" ON "SimShell"("shellRef");
CREATE UNIQUE INDEX "SimShell_offering_period_key" ON "SimShell"("offeringId", "periodId");
CREATE INDEX "SimShell_status_idx" ON "SimShell"("status");

CREATE TABLE "SimStudentEnrolment" (
    "id" TEXT NOT NULL,
    "shellId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Student',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimStudentEnrolment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SimStudentEnrolment_shell_student_key" ON "SimStudentEnrolment"("shellId", "studentId");
CREATE INDEX "SimStudentEnrolment_student_status_idx" ON "SimStudentEnrolment"("studentId", "status");

ALTER TABLE "SimStudentEnrolment" ADD CONSTRAINT "SimStudentEnrolment_shellId_fkey" FOREIGN KEY ("shellId") REFERENCES "SimShell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SimStaffRole" (
    "id" TEXT NOT NULL,
    "shellId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "moodleRole" TEXT NOT NULL,
    "quizScope" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimStaffRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SimStaffRole_shell_account_key" ON "SimStaffRole"("shellId", "accountId");
CREATE INDEX "SimStaffRole_account_status_idx" ON "SimStaffRole"("accountId", "status");

ALTER TABLE "SimStaffRole" ADD CONSTRAINT "SimStaffRole_shellId_fkey" FOREIGN KEY ("shellId") REFERENCES "SimShell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SimGroupMember" (
    "id" TEXT NOT NULL,
    "shellId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SimGroupMember_shell_group_student_key" ON "SimGroupMember"("shellId", "groupId", "studentId");
CREATE INDEX "SimGroupMember_group_status_idx" ON "SimGroupMember"("groupId", "status");

ALTER TABLE "SimGroupMember" ADD CONSTRAINT "SimGroupMember_shellId_fkey" FOREIGN KEY ("shellId") REFERENCES "SimShell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
