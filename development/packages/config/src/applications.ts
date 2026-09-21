/** Fictional application fixture policy. This is not UNZA policy. */
export const APPLICATION_DEMO_V1 = {
  version: "APPLICATION-DEMO-v1",
  demo: true,
  timezone: "Africa/Lusaka",
  maxActivePerIntake: 3,
  maxChoices: 1,
  fee: {
    status: "NOT_REQUIRED" as const,
    explanation:
      "No application fee is required in this fictional demonstration.",
  },
  contactRequirement: "At least one verified email address or mobile number.",
  upload: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    extensions: ["pdf", "jpg", "jpeg", "png"],
    minimumStage: "AwaitingQualityCheck",
    scanner:
      "ClamAV plus PDF structural validation; exact bundled fixtures only in explicit demo mode",
  },
  declarations: [
    {
      id: "accuracy",
      version: "DEMO-DECLARATION-v1",
      text: "I have reviewed my programme choice and confirm that the information I supplied is complete and accurate to the best of my knowledge.",
      required: true,
      owner: "Admissions (demonstration)",
      effectiveDate: "2026-09-19",
      purpose: "Record the applicant’s review of the submitted version.",
    },
    {
      id: "evidence",
      version: "DEMO-DECLARATION-v1",
      text: "I confirm that the documents I supplied represent my declared qualifications and understand that they still require formal verification.",
      required: true,
      owner: "Admissions (demonstration)",
      effectiveDate: "2026-09-19",
      purpose: "Acknowledge the evidence verification process.",
    },
    {
      id: "processing",
      version: "DEMO-DECLARATION-v1",
      text: "I acknowledge that authorized admissions staff will process the submitted information for assessment. This demonstration does not make an admission decision.",
      required: true,
      owner: "Admissions (demonstration)",
      effectiveDate: "2026-09-19",
      purpose: "Explain the purpose of admissions processing.",
    },
  ],
  rateLimit: {
    generalPerMinute: 180,
    documentsPerMinute: 30,
    windowMinutes: 1,
  },
  autosaveDelayMs: 1500,
  routes: [
    { code: "ECZ", label: "Grade 12 / ECZ" },
    { code: "INTL", label: "International qualification" },
  ],
  qualifications: {
    subjects: [
      "Mathematics",
      "English",
      "Biology",
      "Chemistry",
      "Physics",
      "Science",
      "Geography",
      "History",
    ],
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    minimumYear: 1950,
    allowAwaiting: false,
  },
  help: "Contact Admissions through your institution’s published support route. Use fictional data in this demonstration.",
  case: {
    statusPollMs: 30000,
    clarificationResponseDays: 14,
    correctionReviewNote:
      "Corrections need an Admissions decision. The submitted application stays unchanged until approval.",
    withdrawalConfirmation:
      "Withdrawing ends assessment of this application. This does not request a refund.",
    supportChannels: ["Admissions", "Technical access", "Documents", "Decision"],
    notificationRetentionDays: 90,
  },
};
