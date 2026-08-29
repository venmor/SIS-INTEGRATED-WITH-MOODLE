<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: b2173134-0904-55fd-8cb7-ab1988713fa4; chronological message: 114. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 2: Public programme discovery and eligibility guidance

This part defines how a person finds a suitable programme, understands entry requirements and receives useful—but non-binding—eligibility guidance before creating an account or application.

---

## 1. Purpose and boundary

The public discovery experience must help a prospective applicant answer:

1. What programmes are available?
2. Which intake, campus and study modes are open?
3. What are the entry requirements?
4. What documents and fees will I need?
5. Am I likely to meet the published requirements?
6. What do I do next?

It must not:

- Guarantee admission
- Replace formal verification of ECZ, ZAQA or other evidence
- Hide closed or unavailable programmes without explanation
- Invent requirements from incomplete data
- Recommend a programme solely from grades without explaining the basis
- Collect sensitive personal information before it is necessary

The public result is always described as **guidance**, not an admission decision.

---

## 2. Information architecture

The public admissions area contains:

- **Find a programme**
- **Programme details**
- **Compare programmes**
- **Entry requirements**
- **Intakes and deadlines**
- **Fees and funding information**
- **Eligibility guidance**
- **How to apply**
- **Help and contact**
- **Create account / Sign in**

A person can reach a programme page from search, faculty/school navigation, a shared link, a direct URL or a saved comparison.

---

## 3. Programme catalogue

### 3.1 Programme search screen

The page title is:

> Find a programme

It includes one prominent search field:

> Search by programme name, subject or qualification

Example search terms:

- `Computer Science`
- `Radiography`
- `Business`
- `Diploma`
- `Postgraduate`

Search results update only after a brief pause or when the user submits the search. The interface must not interrupt typing with constant loading movement.

Available filters are displayed as labelled controls, not icon-only controls:

- Level: Certificate, Diploma, Bachelor’s, Master’s, PhD
- Study mode: Full-time, Part-time, Distance, Online—where offered
- Campus or location
- School or faculty
- Intake
- Qualification route
- Availability: Open for applications, Opens soon, Not currently open

Filters must be reflected in the page URL so a person can share or return to the same result set.

### 3.2 Search-result card

Each programme result shows:

- Official programme name
- Award level
- School/faculty
- Duration
- Campus or delivery location
- Study mode
- Current intake availability
- Application deadline, where open
- Entry-requirement summary
- `View programme`
- `Compare`

Example:

> **BSc Computer Science**  
> Bachelor’s degree · School of Natural Sciences  
> Full-time · Main Campus · 4 years  
> Applications open until 30 September 2026  
> Requires approved Grade 12 subjects and minimum grades.  
> `View programme`  `Compare`

A programme shown as unavailable must say why:

> This programme is not accepting applications for the selected intake. The next planned intake is being confirmed.

It must not display an inactive button without explanation.

### 3.3 Result states

| Situation | Interface response |
|---|---|
| No search entered | Show popular programmes, browse-by-school links and guidance—not an empty results area |
| No results | Explain that no programme matched; retain search term and filters; suggest removing filters or browsing schools |
| Search service loading | Show stable skeleton cards and announce “Searching programmes” to screen readers |
| Catalogue temporarily unavailable | Show a service message, contact route and retry control; never display stale results as current without a visible last-updated date |
| Closed programme | Show it, label it clearly and offer a related open programme only as a suggestion |
| Programme retired | Preserve public record page where appropriate, label it “No longer offered” and prevent new applications |
| Programme changed after a saved comparison | Show “Requirements updated” with date and allow the user to refresh comparison |

---

## 4. Programme detail page

The programme page is the authoritative public presentation for a configured programme offering.

It displays:

### A. Overview

- Official name and award
- School/faculty and department
- Programme code where it is meaningful to applicants
- Duration
- Campus and delivery mode
- Intake availability
- Application deadline
- Tuition/fee information or a clear link to the approved fee schedule

### B. What the programme covers

A plain-language overview and approved learning/outcome summary. It must not make unverified claims about guaranteed employment, accreditation or professional registration.

### C. Entry requirements

Requirements are structured, not buried in a PDF:

- Required qualification route
- Required subjects
- Minimum grades or points
- Required prior qualification for postgraduate routes
- Additional examination, interview, portfolio or health requirements where approved
- Whether the requirement is mandatory, alternative or recommended
- Evidence required for each condition

For example:

> **English:** Grade 12 requirement — mandatory  
> **Mathematics:** Grade 12 requirement — mandatory  
> **Science subject:** one approved subject — mandatory  
> **Verified result statement:** required before final decision

The exact qualification rules are configuration controlled by the authorized admissions/regulatory office. Developers must not hard-code requirements into page components.

### D. Application checklist

The applicant sees a programme-specific checklist:

- Personal identity information
- Contact details
- Qualification details
- Required supporting documents
- Application fee or fee-waiver process
- Programme-specific evidence
- Submission deadline

### E. Actions

- `Check my eligibility`
- `Start application`
- `Save programme`
- `Compare`
- `Ask a question`

The `Start application` action checks that the intake is open before opening account creation or application start.

---

## 5. Programme comparison

Comparison is optional and should remain simple.

A person may compare up to three programme offerings at once. The comparison page shows only meaningful differences:

| Field | Programme A | Programme B |
|---|---|---|
| Award level | | |
| Duration | | |
| Campus/mode | | |
| Intake status | | |
| Deadline | | |
| Core entry requirements | | |
| Additional selection requirements | | |
| Fee-schedule link | | |

The comparison must not rank programmes as “better” or recommend one based solely on incomplete eligibility data.

If a programme becomes unavailable while it is being compared, the page labels the change and preserves the other entries.

---

## 6. Eligibility guidance

### 6.1 Purpose

Eligibility guidance helps a prospective applicant compare the facts they provide with the **published requirements**.

The result is not an admission decision and must always state:

> This is an initial guidance result based on the information you entered. Your application and documents will still be formally assessed.

### 6.2 Entry points

The person may select `Check my eligibility` from:

- A programme page
- A comparison page
- The public admissions home page

The selected programme and intake remain visible throughout the check.

### 6.3 Eligibility-guidance flow

The flow uses short steps. It asks only for information necessary for the selected programme and route.

1. **Choose qualification route**  
   Example: Grade 12/ECZ, diploma, degree, international qualification, postgraduate route.

2. **Enter subjects and grades or previous qualification**  
   The page provides programme-specific required fields and examples.

3. **Answer programme-specific conditions**  
   For example, whether a required portfolio, examination or professional prerequisite is available.

4. **Review entered information**

5. **View guidance result**

The user can go back without losing information. Data is retained only for the current session unless the user chooses to save it after creating an account.

### 6.4 Guidance outcomes

| Outcome | Meaning | Applicant-facing language |
|---|---|---|
| Appears to meet published requirements | Entered information matches baseline published conditions | “Based on the information entered, you appear to meet the published minimum requirements.” |
| May meet requirements; verification needed | Information is incomplete or requires formal equivalency review | “Your information may meet the requirements, but formal verification is required.” |
| Missing required information | The system cannot evaluate a requirement | “We need more information before providing guidance.” |
| Does not currently match published requirements | Entered data does not meet a clear mandatory rule | “Based on the information entered, this programme’s published minimum requirement is not yet met.” |
| Guidance unavailable | Rules are not configured sufficiently for automated comparison | “Eligibility guidance is not available for this programme. Please review the entry requirements or contact Admissions.” |

No outcome may say:

- “You are admitted”
- “You are rejected”
- “You are high risk”
- “You are ineligible forever”

Where policy permits, a person who does not match one programme may be shown related programmes or alternative routes—but the system must explain why they are suggested.

### 6.5 Result screen

The result displays:

- Selected programme and intake
- Entered qualification route
- Each requirement
- The user-entered information used
- Result for each requirement: appears met, not yet met, needs verification or information missing
- Clear disclaimer
- Next steps
- `Start application`
- `Change information`
- `Compare another programme`
- `Save or email this guidance` only after identity/account safeguards are met

Example:

> **Mathematics requirement — appears met**  
> You entered Grade 4 in Mathematics. The published minimum is Grade 6 or better.  
>
> **Verified ECZ result statement — formal verification required**  
> You will need to upload the required evidence during your application.

Colour may support the result but cannot be the only indicator. Each outcome includes visible text and an accessible status label.

---

## 7. Microinteractions and validation

| User action | Interface behaviour |
|---|---|
| Types a programme name | Search waits briefly before querying; keyboard focus remains in the field |
| Applies a filter | Result count updates; selected filter is visible and removable |
| Opens a programme | Focus lands on programme title; browser URL identifies the offering |
| Selects Compare | Button changes to `Added to comparison`; a screen-reader announcement confirms it |
| Reaches three-programme comparison limit | Explain the limit and offer `View comparison` or `Remove a programme` |
| Chooses a qualification route | Only relevant fields appear; hidden fields are not treated as missing |
| Enters a grade | Validate format after leaving the field or continuing; do not interrupt each keystroke |
| Enters an uncertain result | Offer “I do not know this yet” where policy allows, then classify guidance as incomplete |
| Changes programme mid-check | Explain that requirements differ and ask whether to restart the guidance check |
| Attempts to start an application for closed intake | Explain the intake is closed and offer future-intake or notification options where configured |

Error messages must say both what is wrong and how to fix it.

Example:

> Enter a grade from 1 to 9, or choose “I do not know this result yet.” Do not enter a percentage.

---

## 8. Architecture contract

### 8.1 Core entities introduced

| Entity | Purpose |
|---|---|
| Programme catalogue record | Public summary of an approved programme |
| Programme offering | A programme available for a defined intake, mode and location |
| Entry requirement rule | Versioned, authorized requirement condition |
| Qualification route | The applicant’s route into the programme |
| Eligibility guidance session | Temporary comparison session and entered facts |
| Eligibility outcome | Explainable, non-binding result for each rule |
| Public content version | Published programme/requirement content and effective dates |

### 8.2 Commands

| Command | Authorization | Result |
|---|---|---|
| `SearchProgrammeCatalogue` | Public | Returns published programme offerings only |
| `ViewProgrammeOffering` | Public | Returns current approved public details |
| `StartEligibilityGuidance` | Public | Creates temporary guidance session |
| `EvaluatePublishedRequirements` | Public | Evaluates only configured published rules |
| `SaveProgrammeComparison` | Public/session | Retains selected programme references |
| `StartApplicationFromProgramme` | Authenticated applicant | Checks intake status before draft creation |

### 8.3 Events

- `EligibilityGuidanceStarted`
- `EligibilityGuidanceEvaluated`
- `ProgrammeOfferingViewed`
- `ProgrammeComparisonUpdated`
- `ProgrammeOfferingPublicationChanged`

No eligibility-guidance event may automatically create an application, admissions case or student-support observation.

### 8.4 Data freshness and versioning

Every programme and requirement page records:

- Published version
- Effective date
- Last updated date
- Owning office
- Applicable intake

When a requirement changes, the institution must define whether applications already started continue under the prior version or must follow the new version. The system records which version applied when the applicant started and submitted their application.

---

## 9. Acceptance tests

Part 2 is accepted when:

- A visitor can find a programme using search, filters and school/faculty browsing.
- A programme page displays current, approved and intake-specific information.
- Closed, retired and unavailable programmes are explained rather than silently hidden.
- Requirements are structured, accessible and versioned.
- Eligibility guidance explains each conclusion and never promises admission.
- The guidance check works with keyboard-only navigation, screen readers and narrow mobile screens.
- Search, filters, comparison and eligibility checks retain context safely.
- A person cannot start an application for a closed intake.
- A requirement change is visible and traceable to its applicable version.
- The system avoids collecting identity documents, NRC/passport data or unnecessary sensitive information during public guidance.
- Public catalogue and guidance failures provide a recovery route and do not misrepresent stale information as current.

**Please approve Part 2: Public programme discovery and eligibility guidance.** After approval, I will continue with Part 3: **account creation, password, phone-number verification and secure sign-in experience**.

---

## Following user responses before the next design record

### User message 0115

i have approved part 2,we can now proceed with part 3
