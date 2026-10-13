# Accessibility & Cross-Platform Proof — Task 1.7

**Purpose**: Guide for Charles and Chitindu to verify WCAG 2.2 AA compliance, cross-platform (Arch/WSL) reproducibility, and human-explainable system boundaries.

**Reference**: GAP-015 Row 7, APPLICANT-WALKTHROUGH.md, VERIFICATION.md

---

## Pre-conditions

- [ ] Node **24.21.0** (pinned via `.nvmrc`)
- [ ] PostgreSQL 18 (dedicated isolated database)
- [ ] `DEMO_MODE=true` `APPLICATION_SCANNER=demo-fixtures`
- [ ] Fresh database with migrations + `ALLOW_DEMO_SEED=true` seed
- [ ] API on port 3101, Web on port 3100

```bash
# In development/
npm ci
npm run build --workspace=@sis/config
node scripts/with-env.mjs prisma migrate deploy
ALLOW_DEMO_SEED=true node scripts/with-env.mjs node prisma/seed/seed.ts
```

---

## Checklist: Charles (Primary Review)

### 1. Complete Applicant Journey (10 min story)

| Step | Screen | Explain in Own Words |
|------|--------|---------------------|
| 1 | `/discover` | "Published programme ≠ admission promise. Rules/deadlines from server." |
| 2 | Sign in → Start Application | "Account identity ≠ application ownership. Draft start ≠ submit." |
| 3 | Personal/Contact/Qualification sections | "Valid fields save with version. Second device cannot silently overwrite. Account verification locked." |
| 4 | Upload `fictional-result.pdf` → Check file safety | "Uploaded = quarantined first. Exact fictional PDF = demo allowlist. NOT proof of production scanner." |
| 5 | Review blockers → Declarations → Confirm → Receipt | "DB commits snapshot + audit + handoff together. Double submit = same receipt." |
| 6 | Refresh receipt → Recovery test | "Lost response ≠ failed action. Check saved result instead of creating another." |
| 7 | Source map → Pending gates | "Slices 2–5 + earlier fixes. Staff assessment, clarifications, production approval = later work." |

**Acceptance**: Can explain controller → service → DB boundaries without reading code.

---

### 2. Failure Mode Demonstrations

- [ ] **Impossible date + valid field**: Show valid save + specific error (not "everything failed")
- [ ] **Unsaved navigation**: Type → click another section → cancel warning → entries remain
- [ ] **Concurrent edit**: Same draft in two tabs → save in one → attempt old version in other → show diff comparison
- [ ] **Document replace**: Replace with reason → show history + renewed quarantine
- [ ] **Dropped response**: Browser test drops response AFTER server commits → check saved result
- [ ] **Cross-applicant denial**: API test proves another applicant cannot read this draft

---

### 3. Accessibility Review (WCAG 2.2 AA)

| Criterion | Test Method | Pass/Fail | Notes |
|-----------|-------------|-----------|-------|
| **Keyboard-only navigation** | Tab through entire journey; no mouse | | |
| **Focus visible** | Focus indicator on all interactive elements | | |
| **Focus order** | Logical tab sequence (top-to-bottom, left-to-right) | | |
| **200% zoom** | Browser zoom to 200%; no horizontal overflow | | |
| **400% zoom** | Browser zoom to 400%; content reflows | | |
| **Screen reader (NVDA/JAWS/VoiceOver)** | Labels, errors, live regions announced | | |
| **Error prevention** | Specific field errors (not generic) | | |
| **Error recovery** | Clear next action + support reference | | |
| **Color contrast** | All text ≥ 4.5:1 (UI ≥ 3:1) | | |
| **Reduced motion** | `prefers-reduced-motion` respected | | |

**Mobile viewport**: Test at 390px width (simulated mobile)
- [ ] No horizontal overflow
- [ ] Touch targets ≥ 44×44px
- [ ] No localStorage for sensitive data

---

### 4. Slow Network / Recovery

- [ ] Throttle to 3G (Fast 3G ~1.6 Mbps / 150ms RTT)
- [ ] Form saves complete; progress indicators show
- [ ] Submission timeout handled gracefully
- [ ] "Check saved result" button works after lost response
- [ ] No double-submission on retry

---

### 5. Cross-Platform Reproduction

| Platform | OS | Browser | Status |
|----------|-----|---------|--------|
| Arch Linux | Native | Firefox/Chromium | |
| WSL2 | Ubuntu/Arch | Firefox/Chromium | |

**Both must**: Run identical commands from `development/`; produce identical results.

---

### 6. Source-to-Code Map Verification

- [ ] Trace one save from screen → DB (per PHASE-2-IMPLEMENTATION-REVIEW.md mermaid diagram)
- [ ] Verify handbook section → implementation file links in HANDBOOK-REVIEW.md
- [ ] Confirm 70 exact record bodies + 227 checksums intact (`git status` clean on handbook)

---

### 7. Production Gates Review

| Gate | Status | Notes |
|------|--------|-------|
| GAP-015 Row 1: Contact verification/MFA | | Services exist, provider decisions pending |
| GAP-015 Row 2: Scope hierarchy/approver proof | ✅ | Implemented |
| GAP-015 Row 3: Application multiplicity/fees/declarations | ✅ | Production config exists (TODO markers) |
| GAP-015 Row 4: Document safety | ✅ | ClamAV + PDF validation |
| GAP-015 Row 5: Production file storage | ✅ | MinIO + ObjectStorageService |
| GAP-015 Row 6: Delivery workflows | ✅ | Outbox worker + 8 templates |
| GAP-015 Row 7: Human/accessibility proof | ⏳ | **This task** |
| Remote CI (GitHub Actions) | | Branch protection not yet enabled |
| Migration history | | 45 migrations; checksum caution documented |

---

### 8. Questions to Answer (Without Reading Code)

1. What stops another applicant reading this draft?
2. Why is a disabled button insufficient?
3. What if the fee policy changes after saving?
4. What if the server commits but the internet disconnects?
5. Why is the outbox event not proof of delivered email?
6. Which approval or provider must exist before this demo becomes a production workflow?

---

## Checklist: Chitindu (WSL/Arch Reproduction)

### 1. Environment Setup

- [ ] WSL2 with Ubuntu 24.04 or Arch
- [ ] Node 24.21.0 via `fnm`/`nvm`
- [ ] PostgreSQL 18 in Docker (or native)
- [ ] Same `development/` checkout
- [ ] Fresh database + seed

### 2. Identical Journey

- [ ] Run all commands from APPLICANT-WALKTHROUGH.md
- [ ] Same fictional credentials: `bwalya.m` / `Seed-2026-Bwalya`
- [ ] Same `127.0.0.1` host spelling
- [ ] Produce identical receipt/reference

### 3. Ownership/Version/Command Replay Explanation

- [ ] Explain: Account identity vs application ownership
- [ ] Explain: Version counter prevents silent overwrite
- [ ] Explain: Idempotency key enables safe retry
- [ ] Draw save → DB sequence from memory

---

## Evidence Collection

### Required Artifacts

| Artifact | Location | Collected |
|----------|----------|-----------|
| Charles explanation recording | (verbal/written) | |
| Chitindu WSL reproduction log | `development/.superpowers/...` | |
| Accessibility test screenshots | `development/playwright-report/` | |
| 390px mobile screenshots | `test-results/` | |
| Keyboard-only navigation video | | |
| Screen reader session log | | |
| Slow-network throttle results | | |

### Sign-off

| Reviewer | Date | Signature |
|----------|------|-----------|
| Charles | | |
| Chitindu | | |

---

## Automation Support

Run these to generate baseline evidence:

```bash
# Browser tests (390px, keyboard, no localStorage)
npm run test:browser

# Accessibility audit (axe-core via Playwright)
npx playwright test tests/browser/ui-*.visual.spec.ts --reporter=html

# Source integrity
npm run scan
git diff --check
```

---

## Definition of Done

- [ ] Charles completes all Section 1-7 items
- [ ] Chitindu completes all Section 1-3 items on WSL/Arch
- [ ] All accessibility criteria pass (or documented exceptions)
- [ ] Both answer all 6 questions without code reference
- [ ] Evidence artifacts collected
- [ ] Sign-off recorded above

---

## Notes

- **Do not** claim full accessibility certification — this is a review checkpoint
- **Do not** reset shared databases; use isolated fictional databases only
- **Do not** treat test existence as proof of execution — run and verify
- **Production deployment** still requires: provider decisions, branch protection, CI, migration history review, human walkthrough sign-off