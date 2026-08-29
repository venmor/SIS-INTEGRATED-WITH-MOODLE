<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 41e836d1-22ce-5cde-bc40-614cbe2bccaf; chronological message: 71. -->

## Design Section 6 — Admissions, onboarding and student finance

### 1. Admission-cycle configuration

An admission cycle defines:

- Intake and academic year.
- Application opening and closing dates.
- Undergraduate, taught-postgraduate and research-postgraduate routes.
- Available programmes and capacities.
- Application-form version.
- Entry-requirement versions.
- Required documents.
- Application fee where applicable.
- Evaluation rubrics.
- Decision and offer deadlines.
- Responsible academic and administrative units.

```text
DRAFT
→ APPROVED
→ OPEN
→ CLOSED_TO_APPLICATIONS
→ UNDER_PROCESSING
→ DECISIONS_COMPLETE
→ ARCHIVED
```

### 2. Configurable application forms

Forms are assembled from approved field and document definitions. Different routes can request different information.

| Route | Example requirements |
|---|---|
| Undergraduate | School results, certificates, identity evidence, programme choices and sponsorship category |
| Taught postgraduate | Previous degrees, transcripts, employment history, references and programme-specific statements |
| Research postgraduate | Qualifications, transcripts, research proposal, intended field, references, publications and potential-supervisor information |
| International applicant | Passport, qualification equivalence, immigration-related evidence and international contact information |

A submitted application retains the exact form and requirement versions used at submission.

### 3. Applicant identity and duplicate prevention

- A person is created once and may submit applications in different cycles.
- Email address is not used as the permanent person identifier.
- Duplicate checks may compare names, date of birth, identity numbers, previous student numbers and verified contact details.
- Possible duplicates enter a human review queue.
- The system never automatically merges people.
- A merge requires authority, evidence, before-and-after history and reversible identifiers.

### 4. Admission processing stages

```text
Submission
→ Completeness validation
→ Document verification
→ Eligibility evaluation
→ Academic evaluation
→ Selection and ranking
→ Recommendation
→ Authorised decision
→ Offer
```

Eligibility and selection remain separate:

- **Eligibility** determines whether minimum entry requirements are satisfied.
- **Selection** determines whether an eligible applicant receives an available place.

An eligible applicant is not automatically admitted.

### 5. Programme-choice processing

Each programme choice independently records:

- Preference rank.
- Entry requirements.
- Eligibility outcome.
- Evaluation score or recommendation.
- Capacity status.
- Academic-unit review.
- Final decision.

If institutional policy permits, an unsuccessful first choice may be considered for another choice without creating a duplicate application.

### 6. Postgraduate evaluation

Research-postgraduate applications may include:

- Research-area classification.
- Proposal review.
- Academic preparation review.
- Reference reports.
- Interview.
- Supervisor expertise match.
- Supervisor workload and capacity.
- Resource or laboratory availability.
- Ethics-risk indication.
- School and graduate-studies approval.

A possible-supervisor match is not yet a formal supervision assignment. Formal assignment occurs after matriculation through the postgraduate-research domain.

### 7. Admission decisions and offers

Supported decisions include:

```text
ADMIT
ADMIT_WITH_CONDITIONS
WAITLIST
REJECT
REFER_TO_ALTERNATIVE_PROGRAMME
REQUEST_FURTHER_REVIEW
```

Conditions may include:

- Certified documents.
- Final qualification results.
- Bridging course.
- English-language evidence.
- Funding evidence.
- Research-proposal revision.
- Supervisor availability.
- Regulatory clearance.

A condition defines its evidence, responsible reviewer, deadline and whether it blocks matriculation.

### 8. AI in admissions

AI may:

- Extract candidate-provided information from documents.
- Suggest possible duplicate records.
- Identify missing evidence.
- Summarise a research proposal.
- Compare submitted information against published requirements.
- Draft applicant communications.

AI cannot:

- Reject an applicant.
- Approve an offer.
- Rank applicants without an approved human-reviewed method.
- fabricate missing evidence.
- silently change submitted information.

Every AI-derived value remains unverified until confirmed by an authorised person.

### 9. Offer acceptance and matriculation

```text
Offer accepted
→ Mandatory conditions reviewed
→ Identity resolved
→ Admission record confirmed
→ Academic career created
→ Programme attempt created
→ Curriculum version assigned
→ Student identifier issued
→ Onboarding initiated
```

Matriculation is idempotent: repeating the command cannot create additional students or programme attempts.

### 10. Onboarding checklists

Onboarding uses configurable task templates. Tasks may include:

- Personal-details confirmation.
- Emergency-contact information.
- Identity-provider account provisioning.
- Policy acknowledgement.
- Data-consent choices.
- Document submission.
- Programme orientation.
- Library or external-service referral.
- Student-finance setup.
- Scholarship or sponsorship confirmation.
- Accessibility-support referral.
- Initial academic-adviser assignment.
- Moodle orientation.
- Student-card request.

Each task has:

```text
NOT_STARTED
→ IN_PROGRESS
→ SUBMITTED
→ VERIFIED
→ COMPLETED
```

Alternative states:

```text
CHANGES_REQUIRED
WAIVED
NOT_APPLICABLE
EXPIRED
```

A checklist rule determines which tasks block institutional registration.

---

## Student finance

### 11. Student-account boundary

The SIS student-finance module owns:

- Student charges.
- Invoices and statements.
- Scholarships and sponsorships.
- Payments and allocations.
- Credit notes and adjustments.
- Refund requests.
- Payment arrangements.
- Financial holds.
- Registration clearance.
- Repeat-course and assessment fees.

The external general ledger remains authoritative for institutional accounting.

### 12. Fee configuration

A versioned fee schedule can use:

- Academic career.
- Programme and curriculum.
- Campus.
- Delivery mode.
- Full-time or part-time load.
- Domestic or international classification.
- Sponsorship category.
- Course credits.
- Course type.
- Repeat attempt.
- Laboratory or clinical component.
- Academic period.
- Approved waiver.

Supported calculation methods include:

```text
Flat programme fee
Fee per academic period
Fee per course
Fee per credit
Component-specific fee
Tiered fee
Percentage-based fee
Institution-approved formula
```

Formulas use a restricted, tested rule model—not arbitrary executable code.

### 13. Fee-assessment workflow

```text
Eligibility established
→ Applicable fee rules resolved
→ Assessment simulated
→ Charge lines generated
→ Validation
→ Charges posted
→ Invoice or statement issued
```

Every charge line records:

- Fee rule and version.
- Calculation inputs.
- Amount and currency.
- Academic period.
- Programme or course.
- Sponsorship responsibility.
- Posting and due dates.
- Reversal relationship where applicable.

### 14. Immutable student subledger

Posted financial transactions are not edited or deleted.

Corrections use:

- Reversal.
- Credit note.
- Debit adjustment.
- Reallocation.
- Refund.

The account balance must always be reproducible from posted ledger transactions.

### 15. Payment processing

```text
RECEIVED
→ VALIDATION
→ VERIFIED
→ POSTED
→ ALLOCATED
→ RECONCILED
```

Exception states:

```text
DUPLICATE_SUSPECTED
UNMATCHED
FAILED
REVERSED
REFUND_PENDING
REFUNDED
```

A payment records:

- Provider transaction reference.
- Payer.
- Amount and currency.
- Payment channel.
- Value date.
- Student or invoice reference.
- Verification evidence.
- Allocation history.
- Reconciliation status.

Provider transaction references and idempotency keys prevent duplicate posting.

### 16. Scholarships and sponsorships

A sponsorship agreement defines:

- Sponsor.
- Covered students or eligibility group.
- Applicable periods.
- Covered fee categories.
- Percentage or amount limits.
- Conditions.
- Sponsor billing arrangements.
- Start and end dates.

A sponsor promise is not treated as cash received. The system separately tracks:

- Student responsibility.
- Sponsor responsibility.
- Amount invoiced.
- Amount paid.
- Outstanding sponsor balance.

### 17. Financial clearance

```text
NOT_EVALUATED
→ PENDING
→ CLEARED | HELD | MANUAL_REVIEW
```

Clearance policy may consider:

- Required percentage paid.
- Outstanding balance.
- Approved sponsorship.
- Payment arrangement.
- Overdue charges.
- Pending or unmatched payments.
- Approved exemption.

A verified payment causes finance to recalculate clearance. The payment gateway cannot directly register the student.

### 18. Financial holds

A hold records:

- Stable hold code.
- Reason.
- Scope.
- Actions blocked.
- Start and expiry.
- Responsible office.
- Resolution instructions.
- Override authority.

A hold may block specific actions rather than the entire account, such as:

```text
BLOCK_REGISTRATION
BLOCK_EXAM_SLIP
BLOCK_TRANSCRIPT
BLOCK_GRADUATION_CLEARANCE
```

Sensitive financial amounts are not exposed to lecturers or invigilators.

### 19. Repeat-course and laboratory fees

Repeat registration receives the applicable attempt and component information from registration.

If a laboratory component is validly carried forward:

- The finance policy determines whether the laboratory charge is removed.
- The exemption references the approved academic carry-forward decision.
- Finance does not independently decide academic equivalence.

### 20. Refunds

```text
REQUESTED
→ ELIGIBILITY_REVIEW
→ FINANCE_REVIEW
→ APPROVED
→ PAYMENT_PENDING
→ PAID
→ RECONCILED
```

Refund calculations may consider:

- Withdrawal date.
- Refund policy version.
- Non-refundable charges.
- Sponsorship source.
- Existing allocations.
- Outstanding balances.

The requester cannot be the sole refund approver.

### 21. General-ledger export

Approved financial postings are grouped into journal-export batches:

```text
PREPARED
→ VALIDATED
→ APPROVED
→ EXPORTED
→ ACKNOWLEDGED
→ RECONCILED
```

The export contains accounting codes and summarised or detailed entries according to institutional configuration. Rejected entries return to a reconciliation queue; they do not alter the student subledger.

### 22. Student financial self-service

Students can:

- View charge explanations.
- Download statements and receipts.
- Submit payment references.
- View payment allocation.
- View sponsorship coverage.
- Request an approved payment arrangement.
- Submit refund requests.
- See holds and resolution instructions.

Students cannot edit posted transactions or mark themselves financially cleared.

Do you approve **Design Section 6: Admissions, onboarding and student finance**?

---

## Following user responses before the next design record

### User message 0072

yes i approve then remember we are in zambia meaning for under graduates we need to try to make a configurable automated system eg results for form 4 previously known as grade 12, eg someone can use a transcript or cetrificate to apply,but the system should provide a form to select the subjects and the grades they got,then the admissions officers can compare the form input with the uploaded documents,then i dont know how they handle postgraduates results,then we also have unknown students from foreign countries these we shouldnt force them to select courses that are not taken in their country,they should have a special application route.we have nrc,phone number,email,address,next of kin,such data is relevant data in zambia,in most cases try to make this as if it will be used locally not cambridge university or YALE

### User message 0075

yes i approve the design
