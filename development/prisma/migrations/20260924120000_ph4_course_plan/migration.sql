-- TASK-PH4-004: courses and draft course plans. Courses carry type, credits,
-- semester and capacity; prerequisites are explicit pairs; curriculum rows
-- bind courses to a published version. Plans are drafts with versioned
-- items; validation is computed at read/submit time, never stored.
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "courseType" TEXT NOT NULL,
    "semester" TEXT,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");
CREATE INDEX "Course_type_semester_idx" ON "Course"("courseType", "semester");

CREATE TABLE "CoursePrerequisite" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "requiresCourseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoursePrerequisite_course_requires_key" ON "CoursePrerequisite"("courseId", "requiresCourseId");

ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_requiresCourseId_fkey" FOREIGN KEY ("requiresCourseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CurriculumCourse" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "semester" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumCourse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumCourse_curriculum_course_key" ON "CurriculumCourse"("curriculumId", "courseId");
CREATE INDEX "CurriculumCourse_curriculum_required_idx" ON "CurriculumCourse"("curriculumId", "required");

ALTER TABLE "CurriculumCourse" ADD CONSTRAINT "CurriculumCourse_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CurriculumCourse" ADD CONSTRAINT "CurriculumCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CoursePlan" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoursePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoursePlan_attempt_period_key" ON "CoursePlan"("attemptId", "periodId");
CREATE INDEX "CoursePlan_attempt_status_idx" ON "CoursePlan"("attemptId", "status");

CREATE TABLE "CoursePlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoursePlanItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoursePlanItem_plan_course_key" ON "CoursePlanItem"("planId", "courseId");
CREATE INDEX "CoursePlanItem_plan_status_idx" ON "CoursePlanItem"("planId", "status");

ALTER TABLE "CoursePlanItem" ADD CONSTRAINT "CoursePlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CoursePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoursePlanItem" ADD CONSTRAINT "CoursePlanItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
