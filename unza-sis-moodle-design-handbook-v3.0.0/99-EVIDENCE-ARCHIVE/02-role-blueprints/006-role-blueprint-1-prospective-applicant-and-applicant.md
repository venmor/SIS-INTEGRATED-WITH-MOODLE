<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 8f90ef4d-32d6-5b15-b396-3377222b5561; chronological message: 123. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 5: Completing application sections

This part defines the applicant-facing forms for:

1. Programme choices  
2. Personal details  
3. Contact details  
4. Citizenship and residency details, where required  
5. Qualifications and results  
6. Programme-specific information  

Document upload, payment, review/declaration and submission are covered in later parts.

---

## 1. Shared form contract

Every application section uses the same experience rules.

### 1.1 Section page structure

Each section contains:

- Clear title and short purpose
- Why information is requested, especially for sensitive fields
- Persistent field labels and examples
- Required/optional indicator in text
- `Save and continue`
- `Save and return later`
- `Back`
- Current save state
- Help route linked to the responsible office

At the bottom, the applicant sees:

> Information marked * is required for this application.

### 1.2 Validation behaviour

Validation occurs:

- When the applicant leaves a completed field, where helpful
- When they select `Save and continue`
- Again on the server before data is saved

It must not:

- Show errors before the applicant has had an opportunity to complete a field
- Delete entered valid information after a recoverable error
- Use colour alone
- Make the applicant guess the correct format

A failed section submission displays:

1. An error summary at the top
2. A link to each affected field
3. Inline error text beside each field
4. Focus on the error summary

Example:

> **There are 2 details to correct**  
> - Enter a valid date of birth.  
> - Select the qualification route you will use for this application.

---

## 2. Section A — Programme choices

### 2.1 Purpose

Programme choices capture the programme offering(s) the applicant wishes to be considered for, subject to configured admissions rules.

This section appears first because the selected programme controls later questions, requirements, documents, fees and deadlines.

### 2.2 Default state

If the applicant started from a programme page, the first choice is prefilled and visibly labelled:

> You selected this programme before starting your application. You may change it before submission, subject to the intake rules.

If the applicant began from the dashboard, they select a programme offering here.

### 2.3 Choice interface

For each permitted choice, the applicant sees:

- Choice order: First, Second, Third—where allowed
- Programme search
- Programme name
- Award/level
- Campus
- Study mode
- Intake
- Entry-requirement summary
- Availability state
- `Remove choice` where permitted

The system does not let an applicant choose the same programme offering twice.

### 2.4 Choice order

Where order matters, the system explains:

> Your choices will be assessed according to the institution’s approved admissions rules. Listing a programme first does not by itself guarantee priority or admission.

Applicants can reorder choices before submission using accessible `Move up` and `Move down` controls as well as drag-and-drop where supported.

### 2.5 Errors and recovery

| Situation | Applicant experience |
|---|---|
| Choice becomes unavailable | Explain why; require replacement before submission if the choice is no longer valid |
| Duplicate choice | “You have already selected this programme for this intake. Choose a different programme.” |
| Maximum choices reached | Explain the allowed maximum and provide remove/change controls |
| Programme requires another qualification route | Explain the requirement and provide `Review qualification route` |
| Applicant changes first choice | Show affected requirements/documents and require confirmation |
| Programme catalogue unavailable | Preserve selected choices; prevent new selection and offer retry |

### 2.6 Architecture rules

- Choice count, order and permitted combinations are configuration driven.
- The saved choice references a specific programme-offering version, not only a programme name.
- Later programme changes retain audit history.
- A choice may be locked after submission or according to an authorized clarification workflow.

---

## 3. Section B — Personal details

### 3.1 Purpose and privacy

This section collects the personal information needed to identify the applicant in the admissions process, communicate decisions and meet approved regulatory requirements.

Before sensitive fields, the page states:

> We use this information to process your application and verify your records. Only authorized staff can access it according to their role.

### 3.2 Fields

The exact field set is governed by institutional policy, but the form supports:

- Given name
- Family name
- Other names—optional
- Preferred name—optional, where supported
- Date of birth
- Sex/gender field only where there is an approved institutional purpose and lawful basis
- Country of birth—where required
- Nationality/citizenship—where required
- NRC, passport or another identity-document type/number—only at the approved point in the process
- Previous applicant or student number—optional, for record matching
- Name-change explanation/evidence indicator—where names differ across documents

The form must distinguish:

- **Legal/official name:** used for verification and official records
- **Preferred name:** used in permitted communications

A preferred name must not overwrite the legal name on official admission documents unless policy allows it.

### 3.3 Date of birth

Input options should support:

- Keyboard entry using the displayed date format
- Calendar selection for users who prefer it
- Screen-reader accessible separate day/month/year controls where needed

The system must not rely on a date picker alone.

Errors:

> Enter your date of birth using day, month and year.

> Check your date of birth. It cannot be in the future.

If age limits apply to a programme, the system explains the rule without making unsupported assumptions.

### 3.4 Identity-number entry

The form first asks:

> Which identity document will you use?

Options are configuration-driven, for example:

- NRC
- Passport
- Refugee/other approved identity document
- I do not currently have an approved identity document

Only then does it display the relevant number field and format guidance.

The system:

- Normalizes whitespace and permitted separators.
- Validates only safe format rules client-side.
- Does not claim identity is verified merely because a pattern matches.
- Masks the identifier after save except when full display is needed for controlled confirmation.
- Does not include it in email/SMS notices, URLs, analytics tools or standard error messages.

If an applicant has no required document, the form explains the available institutional route rather than presenting a dead end.

---

## 4. Section C — Contact details

### 4.1 Purpose

This section confirms the contact information Admissions may use for application-related communication.

It is separate from account security contacts because a person may need to provide an alternate contact or correspondence address, subject to policy.

### 4.2 Fields

- Verified primary email address
- Verified primary mobile number
- Preferred communication channel
- Alternate email—optional
- Alternate mobile number—optional
- Postal/residential address where required
- District, province and country, using approved geographic lists
- Emergency contact only where the admissions process has an approved reason to collect it

Verified account contacts appear with status:

> **Mobile number:** +260 97••• 4567 — Verified  
> `Change mobile number`

Changing a primary verified account contact starts the controlled contact-change flow from Part 3; it must not be edited directly as ordinary application text.

### 4.3 Communication preference

The applicant may select a preferred channel for non-mandatory reminders. The interface states:

> Important admission, financial and regulatory messages may still be sent through required channels.

The preference does not remove the applicant’s responsibility to monitor the portal and official notices.

### 4.4 Address design

Address fields use local conventions and avoid forcing applicants into a foreign address pattern.

The applicant may select:

- Country
- Province/region
- District/city
- Area/locality
- Address line(s)
- Postal address where applicable

If an applicant cannot provide a formal street address, the form provides an approved alternative path rather than rejecting the entry.

---

## 5. Section D — Citizenship, residency and applicant category

### 5.1 Purpose

This section determines which approved admissions rules, fee rules and evidence requirements may apply. It must never use citizenship/residency information to make an unexplained decision.

### 5.2 Fields

Depending on institutional policy and programme, the form may collect:

- Citizenship/nationality
- Country of ordinary residence
- Applicant category, for example local, international or another approved category
- Immigration/residency evidence requirement indicator
- Sponsorship or government-placement route indicator where relevant
- Refugee/asylum or protected-status route only through an approved, restricted workflow where required

The system shows why an answer is necessary.

Example:

> Your country of residence may affect the documents and fee schedule that apply to your application.

### 5.3 Sensitive-data boundary

The system must collect only the minimum category information required for admissions processing.

It must not:

- Infer nationality from name, telephone code or address
- Guess residency status
- Expose immigration evidence to roles without a verified business purpose
- Use citizenship as a proxy for academic merit
- Include sensitive status in general staff search results

Any sensitive evidence follows document access controls and an auditable verification process.

### 5.4 Changes after save

If this section changes, the system identifies affected areas:

> Your applicant category has changed. Review your fee, document and qualification requirements before continuing.

The system does not silently remove already uploaded documents or payment records. It creates an impact-review task where needed.

---

## 6. Section E — Qualifications and results

### 6.1 Purpose

The applicant declares the qualifications and academic results that they want Admissions to assess. These declarations are later supported by documents and formal verification.

A qualification is not considered verified merely because the applicant entered it.

### 6.2 Qualification route

The first question is:

> Which qualification route will you use for this application?

Examples:

- Grade 12 / ECZ route
- Diploma route
- Bachelor’s degree route
- Postgraduate route
- International qualification route
- Mature-entry or other approved route

Choosing a route changes subsequent questions and required evidence. The interface shows:

> Your selected route: Grade 12 / ECZ  
> `Change route`

Changing the route later triggers the Part 4 impact review.

### 6.3 Qualification list

The applicant can add one or more qualifications using:

> `Add qualification`

Each qualification captures only the fields relevant to its type:

| Field | Example |
|---|---|
| Qualification type | Grade 12, Diploma, Bachelor’s degree |
| Awarding institution/examination body | ECZ or named institution |
| Examination/candidate number | Where required |
| Completion year | 2025 |
| Status | Completed, awaiting result, in progress |
| Subject results | Subject and grade, where applicable |
| Classification/grade | Where relevant |
| Qualification/document reference | Where relevant |

A qualification card provides:

- `Edit`
- `Remove`
- `Add supporting document`—when document stage is available
- Current verification status, if formal verification has begun

### 6.4 Grade 12/ECZ results

For routes requiring Grade 12 results:

- The applicant enters subjects and grades in structured rows.
- A subject search uses an approved subject list but provides a controlled “other subject” option where necessary.
- Grade values are constrained to the approved grading scale.
- The applicant can say a result is awaited, where the intake permits it.
- The system identifies missing required subject areas based on the selected programme requirements.

Example:

> Mathematics — Grade 4  
> `Edit` `Remove`

If the person enters `Maths`, the system may suggest the official subject title while preserving the user’s ability to correct it.

The system must not declare ECZ data authentic unless it has been verified through an approved process or integration.

### 6.5 International and prior qualifications

For international, diploma or degree routes, the interface asks for:

- Award title
- Institution/examination body
- Country
- Completion status/year
- Grading classification as issued
- Whether an equivalency assessment is required
- Required evidence checklist

The interface states:

> Your qualification may require equivalency assessment before Admissions can make a final decision.

It must not automatically convert a foreign grade into a local equivalent unless an approved, versioned equivalency rule exists.

### 6.6 Qualification errors and recovery

| Situation | Applicant experience |
|---|---|
| Missing required subject | Identify the exact requirement and return link |
| Grade invalid for selected scale | Explain allowed grades and preserve the typed value until correction |
| Examination number format invalid | Show expected format, but do not claim it is unverified/false |
| Result is awaiting release | Show programme rule and whether the application may continue |
| Same qualification added twice | Offer to view/edit the existing qualification |
| Route changed | Show impact on requirements and documents; require review |
| Qualification requires verification | Mark it `Declared — verification required`, not `Rejected` |
| Required programme rule unavailable | Show support path; do not generate a false eligibility result |

---

## 7. Section F — Programme-specific information

Some programmes require additional information. This section appears only when configured for the selected programme or route.

Examples may include:

- Portfolio declaration
- Interview availability
- Required professional registration evidence
- Clinical-placement readiness requirements
- Research proposal summary for postgraduate study
- Intended supervisor information—where the programme permits applicant input
- Relevant work experience for approved mature-entry routes
- Language proficiency evidence for programmes that require it

### 7.1 Conditional form contract

Every programme-specific question must have:

- Authorized owner
- Published purpose
- Requirement status: mandatory, conditional or optional
- Applicable programme offering and intake
- Validation rule
- Document requirement, where applicable
- Retention classification
- Applicant-visible explanation

The UI states why it is being asked:

> This programme requires a research proposal summary so the department can assess alignment with its approved research areas.

The system must not display a question simply because a generic form component supports it.

### 7.2 Research proposal summary example

Where required, the applicant sees:

- Research interest/title
- Summary or abstract
- Proposed field/discipline
- Optional proposed supervisor preference, clearly labelled as preference only
- Upload requirement, if a proposal document is required

The interface must not imply that naming a supervisor creates a supervision agreement.

---

## 8. Cross-section review rules

Before a section is marked `Complete`, the system checks:

- Required fields are present.
- Format and internal consistency rules pass.
- Conditions triggered by selected route/programme have been addressed.
- Dependent sections are not made invalid by a recent change.
- The applicant has saved the latest version.

When data in one section affects another, the system creates a clear task rather than silently changing facts.

Example:

> Your selected programme requires Mathematics. Review your qualification results before this section can be completed.

---

## 9. Architecture contract

### 9.1 Core entities introduced

| Entity | Purpose |
|---|---|
| Application programme choice | Ordered selection of a programme offering |
| Applicant profile snapshot | Versioned personal details used for the application |
| Application contact record | Application-specific communication and address data |
| Applicant category assessment input | Citizenship/residency data used for configured rules |
| Qualification declaration | Applicant-entered academic qualification |
| Subject result declaration | Structured result under a qualification |
| Programme-specific response | Response to authorized conditional question |
| Requirement impact | Record of sections/tasks affected by a changed answer |

### 9.2 Commands

| Command | Result |
|---|---|
| `SetApplicationProgrammeChoices` | Creates/updates configured programme choices |
| `SaveApplicationPersonalDetails` | Saves versioned personal information |
| `SaveApplicationContactDetails` | Saves application contact data and preferences |
| `SaveApplicantCategoryInformation` | Saves citizenship/residency inputs |
| `SetApplicationQualificationRoute` | Sets route and evaluates dependent requirements |
| `AddQualificationDeclaration` | Adds a declared qualification |
| `UpdateQualificationDeclaration` | Updates permitted qualification details |
| `RecordSubjectResultDeclaration` | Adds/updates a subject result |
| `SaveProgrammeSpecificResponse` | Saves approved conditional information |
| `RecalculateApplicationRequirements` | Creates/removes requirement tasks after a material change |

### 9.3 Events

- `ApplicationProgrammeChoicesUpdated`
- `ApplicationPersonalDetailsSaved`
- `ApplicationContactDetailsSaved`
- `ApplicantCategoryInformationChanged`
- `ApplicationQualificationRouteChanged`
- `QualificationDeclared`
- `QualificationDeclarationUpdated`
- `SubjectResultDeclared`
- `ProgrammeSpecificResponseSaved`
- `ApplicationRequirementImpactDetected`

### 9.4 Audit and visibility

The system records:

- Acting applicant
- Application and draft version
- Changed section and field category
- Timestamp
- Previous and new value for material changes
- Requirement-impact outcome
- Programme/qualification rule version used

Access to full identity numbers, citizenship/residency evidence and sensitive programme-specific data is restricted by role, purpose and organizational scope. Routine staff screens show masked or minimized data.

---

## 10. Part 5 acceptance tests

Part 5 is accepted when:

- Programme-choice limits, combinations and order follow configured institutional rules.
- Applicants cannot select duplicate programme offerings.
- Every personal, citizenship and qualification field explains its purpose where it is not obvious.
- Identity-number format validation does not falsely represent formal identity verification.
- Verified account contacts cannot be silently overwritten in an application form.
- A change in citizenship, residency, route or programme creates a visible impact review.
- Qualification information is structured, editable before submission and clearly labelled as declared until verified.
- International qualifications are not auto-converted without approved equivalency rules.
- Programme-specific questions appear only when authorized and applicable.
- Errors identify the exact field and recovery action.
- Sensitive data is masked and kept out of URLs, ordinary notifications and unauthorized views.
- All section dependencies and resulting applicant tasks are traceable in automated tests.
- Keyboard, screen-reader, zoom, mobile and low-bandwidth form completion tests pass.

**Please approve Part 5: Completing application sections.** After approval, I will continue with Part 6: **supporting-document upload, malware safety, document quality checks, replacement and verification workflow.**

---

## Following user responses before the next design record

### User message 0124

art 6: **supporting-document upload, malware safety, document quality checks, replacement and verification workflow.**
