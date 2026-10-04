/** Production application policy. Values marked TODO require business owner approval.
 * This is NOT the demo configuration — it is loaded when DEMO_MODE !== 'true'.
 * All placeholder values MUST be replaced with approved institutional policy before production use. */
export const APPLICATION_PRODUCTION_V1 = {
  version: "APPLICATION-PRODUCTION-v1",
  demo: false,
  timezone: "Africa/Lusaka",
  // Maximum number of active applications a single applicant can have per intake.
  // TODO: Business owner to approve (Admissions policy).
  maxActivePerIntake: 1,
  // Maximum number of programme choices per application.
  // TODO: Business owner to approve (Admissions policy).
  maxChoices: 3,
  // Application fee is required in production.
  // TODO: Business owner to approve amount and currency (Finance/Admissions policy).
  fee: {
    status: "REQUIRED" as const,
    amountMinor: 150000, // TODO: Business owner to approve (in minor units, e.g., tambala for ZMW)
    currency: "ZMW",
    explanation:
      "A non-refundable application fee is required to process your application. Payment must be completed before submission.",
  },
  contactRequirement:
    "At least one verified email address and one verified mobile number are required.",
  upload: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    extensions: ["pdf", "jpg", "jpeg", "png"],
    minimumStage: "AwaitingQualityCheck",
    scanner:
      "ClamAV plus PDF structural validation; production documents only.",
  },
  // Legal declarations with versioned text. Each declaration must be accepted by the applicant.
  // TODO: Business owner to approve all declaration text (Legal/Admissions policy).
  declarations: [
    {
      id: "accuracy",
      version: "PROD-DECLARATION-v1",
      text: "I declare that all information provided in this application is complete, true, and accurate to the best of my knowledge. I understand that providing false information may result in the rejection of my application or withdrawal of any offer made.",
      required: true,
      owner: "Admissions",
      effectiveDate: "2026-09-19",
      purpose: "Record the applicant's legal declaration of information accuracy.",
    },
    {
      id: "evidence",
      version: "PROD-DECLARATION-v1",
      text: "I confirm that all documents submitted are genuine and represent my own qualifications. I understand that all documents will be verified with the issuing authorities and that fraudulent documents will result in immediate disqualification and may be reported to relevant authorities.",
      required: true,
      owner: "Admissions",
      effectiveDate: "2026-09-19",
      purpose: "Acknowledge the document verification process and consequences of fraud.",
    },
    {
      id: "processing",
      version: "PROD-DECLARATION-v1",
      text: "I consent to the processing of my personal information by the University admissions office for the purpose of assessing my application, in accordance with the Data Protection Act and the University's privacy policy. I understand that my information may be shared with relevant academic departments and external verification bodies.",
      required: true,
      owner: "Admissions",
      effectiveDate: "2026-09-19",
      purpose: "Obtain consent for personal data processing under data protection law.",
    },
    {
      id: "fee",
      version: "PROD-DECLARATION-v1",
      text: "I understand that the application fee is non-refundable regardless of the outcome of my application. I confirm that I have paid or will pay the required fee before my application can be processed.",
      required: true,
      owner: "Finance",
      effectiveDate: "2026-09-19",
      purpose: "Acknowledge non-refundable application fee policy.",
    },
  ],
  rateLimit: {
    generalPerMinute: 60,
    documentsPerMinute: 10,
    windowMinutes: 1,
  },
  autosaveDelayMs: 2000,
  // Qualification routes with eligibility rules.
  // TODO: Business owner to approve route codes and eligibility rules (Admissions policy).
  routes: [
    {
      code: "ECZ",
      label: "Grade 12 / ECZ",
      eligibility: {
        description: "Zambian Grade 12 certificate issued by the Examinations Council of Zambia",
        minSubjects: 5,
        requiredSubjects: ["English", "Mathematics"],
        minGrade: 6,
      },
    },
    {
      code: "INTL",
      label: "International qualification",
      eligibility: {
        description: "Recognised international qualifications (A-Levels, IB, etc.) with ZAQA equivalency",
        minSubjects: 5,
        requiredSubjects: ["English", "Mathematics"],
        requiresEquivalency: true,
        equivalencyBody: "ZAQA",
      },
    },
    {
      code: "DIPLOMA",
      label: "Diploma",
      eligibility: {
        description: "Recognised diploma from an accredited institution",
        minGPA: 2.5,
        requiresTranscript: true,
        requiresEquivalency: false,
      },
    },
    {
      code: "DEGREE",
      label: "Bachelor's degree",
      eligibility: {
        description: "Recognised bachelor's degree from an accredited institution",
        minClassification: "Second Class",
        requiresTranscript: true,
        requiresEquivalency: false,
      },
    },
    {
      code: "POSTGRAD",
      label: "Postgraduate qualification",
      eligibility: {
        description: "Recognised postgraduate qualification from an accredited institution",
        requiresTranscript: true,
        requiresEquivalency: false,
      },
    },
  ],
  // Qualification subjects and grades mapping.
  // TODO: Business owner to approve subject list and grade scale (Admissions policy).
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
      "Civic Education",
      "Computer Studies",
      "Additional Mathematics",
      "Literature in English",
      "Agricultural Science",
      "Commerce",
      "Accounts",
      "Business Studies",
      "Religious Education",
      "French",
      "Portuguese",
    ],
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    minimumYear: 1980,
    allowAwaiting: true,
    awaitingExpiryMonths: 12,
  },
  help: "Contact the Admissions Office at admissions@unza.zm or +260-211-XXXXXXX for assistance.",
  case: {
    statusPollMs: 30000,
    clarificationResponseDays: 14,
    correctionReviewNote:
      "Corrections require an Admissions decision. The submitted application remains unchanged until approval is granted.",
    withdrawalConfirmation:
      "Withdrawing ends assessment of this application. This does not request a refund of the application fee.",
    supportChannels: [
      "Admissions",
      "Technical access",
      "Documents",
      "Decision",
      "Fee payment",
    ],
    notificationRetentionDays: 180,
  },
  // Phase 3 slice 4: production review criteria with weighted scoring.
  // Criteria are versioned; the service stamps criteriaVersion on every recommendation.
  // TODO: Business owner to approve criteria, weights, and thresholds (Admissions policy).
  review: {
    criteriaVersion: "PROD-CRITERIA-v1",
    criteria: [
      {
        key: "COMPLETENESS",
        label: "Application Completeness",
        weight: 0.2,
        description: "All required sections and documents are submitted",
      },
      {
        key: "DECLARATION_MATCH",
        label: "Declaration Consistency",
        weight: 0.15,
        description: "Declarations match the submitted information",
      },
      {
        key: "DOCUMENT_QUALITY",
        label: "Document Quality & Authenticity",
        weight: 0.25,
        description: "Documents are clear, legible, and pass verification checks",
      },
      {
        key: "MINIMUM_ELIGIBILITY",
        label: "Minimum Academic Eligibility",
        weight: 0.25,
        description: "Applicant meets the minimum entry requirements for the programme",
      },
      {
        key: "FEE_PAYMENT",
        label: "Application Fee Payment",
        weight: 0.15,
        description: "Application fee has been paid and confirmed",
      },
    ],
    // Weighted scoring thresholds
    // TODO: Business owner to approve thresholds (Admissions policy).
    scoring: {
      maxScore: 100,
      eligibleThreshold: 70,
      favourableThreshold: 80,
      needsInfoThreshold: 50,
    },
    eligibilityOutcomes: ["ELIGIBLE", "NOT_ELIGIBLE", "UNDETERMINED"],
    recommendations: ["FAVOURABLE", "UNFAVOURABLE", "NEEDS_INFORMATION"],
  },
  // Phase 3 slice 6: onboarding tasks created when an offer is accepted.
  // Owner APPLICANT tasks complete through the applicant case;
  // ADMISSIONS tasks stay pending until staff work completes them.
  // TODO: Business owner to approve task list (Admissions/Registry policy).
  onboarding: {
    tasks: [
      {
        key: "CONFIRM_CONTACT",
        title: "Confirm your preferred contact details",
        owner: "APPLICANT",
        required: true,
        description: "Verify and update your email address and phone number for official communications.",
      },
      {
        key: "ACCEPT_DECLARATIONS",
        title: "Confirm you understand registration is a separate process",
        owner: "APPLICANT",
        required: true,
        description: "Acknowledge that accepting an offer does not constitute registration; a separate registration process follows.",
      },
      {
        key: "SUBMIT_MEDICAL",
        title: "Submit medical fitness certificate",
        owner: "APPLICANT",
        required: true,
        description: "Provide a medical fitness certificate from a registered medical practitioner.",
      },
      {
        key: "VERIFY_DOCUMENTS",
        title: "Admissions verifies your evidence",
        owner: "ADMISSIONS",
        required: true,
        description: "Admissions office completes formal verification of all submitted qualifications and documents.",
      },
      {
        key: "PAY_ACCEPTANCE_FEE",
        title: "Pay the offer acceptance fee",
        owner: "APPLICANT",
        required: true,
        description: "Pay the non-refundable acceptance fee to secure your place.",
      },
      {
        key: "FUNDING_NOTE",
        title: "Read the fee and sponsorship information",
        owner: "APPLICANT",
        required: false,
        description: "Review the fee schedule, payment deadlines, and available sponsorship options.",
      },
      {
        key: "ACCOMMODATION_APPLY",
        title: "Apply for student accommodation (optional)",
        owner: "APPLICANT",
        required: false,
        description: "Submit an application for on-campus accommodation if required.",
      },
    ],
  },
  // Phase 3 slice 6: production offer-acceptance declarations.
  // Versioned like all production policy; the service requires every key on
  // accept and records the version in audit.
  // TODO: Business owner to approve all declaration text (Legal/Admissions policy).
  offer: {
    version: "PROD-OFFER-v1",
    acceptanceDeclarations: [
      {
        key: "UNDERSTAND_TERMS",
        text: "I have read and understood the terms and conditions of this offer, including any conditions attached to my admission.",
      },
      {
        key: "ACCEPT_PROGRAMME",
        text: "I accept the offered programme and intake as stated in this offer letter.",
      },
      {
        key: "INFO_ACCURATE",
        text: "All information I have provided remains accurate to my knowledge. I will notify the University immediately of any changes.",
      },
      {
        key: "REGISTRATION_SEPARATE",
        text: "I understand that registration is a separate process that occurs after acceptance, with its own deadlines and requirements.",
      },
      {
        key: "FEE_OBLIGATIONS",
        text: "I understand my financial obligations including tuition fees, and that fee payment is required before registration.",
      },
      {
        key: "CONDITIONS_ACCEPT",
        text: "I accept any conditions attached to this offer and understand I must satisfy them by the specified deadlines.",
      },
      {
        key: "DATA_CONSENT",
        text: "I consent to the University processing my personal data for academic administration, in accordance with the Data Protection Act.",
      },
    ],
  },
} as const;