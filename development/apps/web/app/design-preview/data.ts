export const studentPreview = {
  studentNumber: "202700123",
  academicPeriod: "January 2027",
  programme: "BSc Software Engineering",
  campus: "Great East Road",
  registrationState: "Registration in progress",
  registrationProgress: {
    complete: 2,
    total: 5,
  },
  deadline: "20 January 2027, 17:00 CAT",
  nextAction: "Check financial clearance",
  tasks: [
    {
      title: "Financial clearance",
      state: "Awaiting institution",
      owner: "Finance",
      due: "18 January 2027",
    },
    {
      title: "Confirm course package",
      state: "Action required",
      owner: "Student",
      due: "19 January 2027",
    },
  ],
  holds: [
    {
      title: "Financial clearance hold",
      effect: "Blocks final registration",
      owner: "Finance",
      state: "Sponsorship confirmation pending",
    },
  ],
  moodle: {
    sisRegistration: "Registration in progress",
    learningAccess: "Waiting for final registration",
    lastConfirmed: "14:32 CAT",
  },
} as const;

export const teachingPreview = {
  academicPeriod: "January 2027",
  scope: "School of Natural Sciences",
  role: "Lecturer · Course coordinator",
  urgent: [
    {
      title: "Review Quiz 1 grade import",
      course: "CSC 4792",
      due: "Today",
    },
  ],
  course: {
    code: "CSC 4792",
    title: "Data Mining and Warehousing",
    scope: "Course-wide",
    classCount: 118,
    tgGroups: 4,
    nextSession: "Thursday · 10:00 CAT",
    sisClassList: 118,
    moodleEnrolled: 117,
    moodleState: "1 learner pending sync",
    teachingRoles: "4 of 4 synced",
    groups: "4 of 4 TG groups synced",
    lastSync: "14:32 CAT",
  },
} as const;


export const operationsPreview = {
  environment: "Production environment",
  health: [
    {
      integration: "Moodle",
      state: "Degraded",
      lastSuccess: "14:02 CAT",
      detail: "27 delayed enrolment events",
    },
    {
      integration: "Notifications",
      state: "Healthy",
      lastSuccess: "14:31 CAT",
      detail: "No delayed deliveries",
    },
    {
      integration: "Qualification verification",
      state: "Unknown",
      lastSuccess: "13:48 CAT",
      detail: "Health check unavailable",
    },
  ],
  attention: [
    {
      title: "Moodle enrolment sync",
      state: "Needs attention",
      detail: "27 events delayed",
      age: "18 minutes",
      href: "/design-preview/operations/event",
    },
    {
      title: "Qualification verification",
      state: "Check provider",
      detail: "4 callbacks awaiting confirmation",
      age: "11 minutes",
      href: null,
    },
  ],
  reconciliation: [
    {
      title: "Registered student missing from Moodle",
      sourceRef: "STU-202700123 · CSC 4792",
      state: "Open",
      lastConfirmed: "14:02 CAT",
      href: "/design-preview/operations/reconciliation",
    },
  ],
  incident: {
    reference: "INC-2027-004",
    title: "Moodle enrolment sync delayed",
    state: "Investigating",
    impact: "Learning access delayed; SIS registration unaffected",
  },
} as const;
