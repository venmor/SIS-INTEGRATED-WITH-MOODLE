import type { DemoUniversityProfile } from "@sis/contracts";

/** Editable starting example only. Never installed without a reviewed activation. */
export const DEMO_UNIVERSITY_TEMPLATE: DemoUniversityProfile = {
  name: "Chisomo Demonstration University",
  rootUnitCode: "DEMO-UNIVERSITY",
  unitTypes: [
    { code: "UNIVERSITY", label: "University", kind: "INSTITUTION" },
    { code: "CAMPUS", label: "Campus", kind: "CAMPUS" },
    { code: "SCHOOL", label: "School", kind: "ACADEMIC" },
    { code: "DEPARTMENT", label: "Department", kind: "ACADEMIC" },
    { code: "CENTRE", label: "Centre", kind: "ACADEMIC" },
  ],
  units: [
    {
      code: "DEMO-UNIVERSITY",
      name: "Chisomo Demonstration University",
      typeCode: "UNIVERSITY",
    },
    { code: "DEMO-MAIN", name: "Main Campus (fictional)", typeCode: "CAMPUS" },
    {
      code: "DEMO-HEALTH",
      name: "Health Campus (fictional)",
      typeCode: "CAMPUS",
    },
    {
      code: "DEMO-COMPUTING",
      name: "School of Computing (fictional)",
      typeCode: "SCHOOL",
    },
    {
      code: "DEMO-BUSINESS",
      name: "School of Business (fictional)",
      typeCode: "SCHOOL",
    },
    {
      code: "DEMO-HEALTH-SCIENCES",
      name: "School of Health Sciences (fictional)",
      typeCode: "SCHOOL",
    },
    {
      code: "DEMO-COMPUTER-SCIENCE",
      name: "Department of Computer Science (fictional)",
      typeCode: "DEPARTMENT",
    },
    {
      code: "DEMO-ACADEMIC-SKILLS",
      name: "Academic Skills Centre (fictional)",
      typeCode: "CENTRE",
    },
  ],
  relationships: [
    ...[
      "DEMO-MAIN",
      "DEMO-HEALTH",
      "DEMO-COMPUTING",
      "DEMO-BUSINESS",
      "DEMO-HEALTH-SCIENCES",
      "DEMO-ACADEMIC-SKILLS",
    ].map((fromCode) => ({
      fromCode,
      toCode: "DEMO-UNIVERSITY",
      type: "REPORTS_TO" as const,
    })),
    {
      fromCode: "DEMO-COMPUTER-SCIENCE",
      toCode: "DEMO-COMPUTING",
      type: "ACADEMICALLY_OWNED_BY",
    },
    { fromCode: "DEMO-COMPUTING", toCode: "DEMO-MAIN", type: "LOCATED_AT" },
    { fromCode: "DEMO-BUSINESS", toCode: "DEMO-MAIN", type: "LOCATED_AT" },
    {
      fromCode: "DEMO-HEALTH-SCIENCES",
      toCode: "DEMO-HEALTH",
      type: "LOCATED_AT",
    },
    {
      fromCode: "DEMO-ACADEMIC-SKILLS",
      toCode: "DEMO-COMPUTER-SCIENCE",
      type: "DELIVERED_BY",
    },
  ],
  periodTypes: [
    { code: "YEAR", label: "Academic year" },
    { code: "REGISTRATION", label: "Registration period" },
    { code: "TEACHING", label: "Teaching period" },
    { code: "EXAMINATION", label: "Examination period" },
    { code: "RESULTS", label: "Result-processing period" },
  ],
  periods: [
    {
      code: "DEMO-2026-YEAR",
      name: "Academic year 2026 (fictional)",
      typeCode: "YEAR",
      parentCode: null,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    },
    {
      code: "DEMO-2026-REGISTRATION",
      name: "Registration (fictional)",
      typeCode: "REGISTRATION",
      parentCode: "DEMO-2026-YEAR",
      startDate: "2026-09-21",
      endDate: "2026-10-16",
    },
    {
      code: "DEMO-2026-TEACHING",
      name: "Teaching period (fictional)",
      typeCode: "TEACHING",
      parentCode: "DEMO-2026-YEAR",
      startDate: "2026-10-05",
      endDate: "2026-12-18",
    },
    {
      code: "DEMO-2026-EXAMINATION",
      name: "Examination period (fictional)",
      typeCode: "EXAMINATION",
      parentCode: "DEMO-2026-YEAR",
      startDate: "2026-12-07",
      endDate: "2026-12-18",
    },
    {
      code: "DEMO-2026-RESULTS",
      name: "Result processing (fictional)",
      typeCode: "RESULTS",
      parentCode: "DEMO-2026-YEAR",
      startDate: "2026-12-14",
      endDate: "2026-12-31",
    },
  ],
};
