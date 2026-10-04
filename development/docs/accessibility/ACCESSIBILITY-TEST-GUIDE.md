# Accessibility Test Execution Guide

**Purpose**: Automated and manual accessibility test procedures for WCAG 2.2 AA verification.

**Reference**: Section 12 (Portals/UX/Accessibility), GAP-015 Row 7

---

## Automated Accessibility Tests

### 1. Playwright + axe-core (Recommended)

```bash
# Install axe-core for Playwright
npm install -D @axe-core/playwright

# Run accessibility audit on key pages
npx playwright test tests/accessibility/ --reporter=html
```

**Create test file**: `tests/accessibility/a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/discover',
  '/sign-in',
  '/applicant/start',
  '/applicant/[id]/personal',
  '/applicant/[id]/contact',
  '/applicant/[id]/qualifications',
  '/applicant/[id]/documents',
  '/applicant/[id]/review',
  '/applicant/[id]/status',
  '/student/readiness',
  '/student/courses',
  '/student/register',
  '/student/finance',
  '/student/changes',
];

test.describe('WCAG 2.2 AA Automated Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Use demo mode for consistent test data
    await page.goto('/sign-in');
    await page.fill('[name="username"]', 'bwalya.m');
    await page.fill('[name="password"]', 'Seed-2026-Bwalya');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/applicant/);
  });

  for (const path of PAGES) {
    test(`No violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
```

### 2. Specific WCAG Criteria Tests

```typescript
test.describe('Specific WCAG 2.2 AA Criteria', () => {
  test('Focus order is logical', async ({ page }) => {
    await page.goto('/applicant/[id]/personal');
    const focusable = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    for (let i = 0; i < focusable.length; i++) {
      await focusable[i].focus();
      await expect(focusable[i]).toBeFocused();
    }
  });

  test('All form inputs have labels', async ({ page }) => {
    await page.goto('/applicant/[id]/contact');
    const inputs = await page.locator('input, select, textarea').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const label = await page.locator(`label[for="${id}"]`).count();
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('Error messages are announced', async ({ page }) => {
    await page.goto('/applicant/[id]/personal');
    await page.fill('[name="dateOfBirth"]', 'invalid-date');
    await page.click('button:has-text("Save")');
    
    const error = page.locator('[role="alert"], .error-message');
    await expect(error).toBeVisible();
    await expect(error).toContainText('date');
  });

  test('Color contrast ≥ 4.5:1', async ({ page }) => {
    await page.goto('/discover');
    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });
});
```

---

## Manual Accessibility Tests

### 1. Keyboard-Only Navigation

```bash
# Run with keyboard only (no mouse)
# Test these scenarios:
```

| Scenario | Expected Behavior |
|----------|-------------------|
| Tab through entire journey | All interactive elements reachable; logical order |
| Skip to main content | "Skip to main content" link works |
| Form navigation | Tab moves between fields; Enter submits |
| Modal/dialog focus trap | Focus stays in modal; Escape closes |
| Dropdown/autocomplete | Arrow keys navigate; Enter selects |
| Data tables | Arrow keys navigate cells |

**Checklist**:
- [ ] No keyboard traps
- [ ] Focus indicator visible on all elements (3px minimum)
- [ ] Focus order matches visual order
- [ ] No "mystery meat" navigation

### 2. Screen Reader Tests

#### NVDA (Windows) / VoiceOver (macOS) / Orca (Linux)

| Page | Test | Expected |
|------|------|----------|
| `/discover` | Landmarks announced | `main`, `nav`, `header`, `footer` |
| Forms | Label + hint + error announced | "Email, edit text, required. Error: Invalid format" |
| Tables | Headers + data cells associated | "Programme, Software Engineering, row 1 of 5" |
| Live regions | Dynamic updates announced | "Saved successfully" / "Error: ..." |
| Buttons | Role + state announced | "Submit, button, disabled" |

**VoiceOver commands**:
- `VO + U` → Rotor → Landmarks/Headings/Links
- `VO + →` → Next element
- `VO + Space` → Activate

### 3. Zoom & Responsive Tests

```bash
# Test at these zoom levels:
# 100% (baseline)
# 200% (WCAG requirement)
# 400% (enhanced)
```

| Viewport | Test | Pass Criteria |
|----------|------|---------------|
| 1440px desktop | 200% zoom | No horizontal scroll; all content readable |
| 1440px desktop | 400% zoom | Content reflows; no overlap |
| 390px mobile | 100% | Touch targets ≥ 44×44px |
| 390px mobile | 200% | Single-column layout |

### 4. Reduced Motion

```css
/* Verify this media query works */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Test**:
1. OS Settings → Accessibility → Reduce motion → On
2. Reload page
3. Verify: No animations, instant transitions

### 5. High Contrast Mode

| OS | Enable | Verify |
|----|--------|--------|
| Windows | Settings → Accessibility → High contrast | All text visible; borders clear |
| macOS | System Settings → Accessibility → Display → Increase contrast | Text ≥ 4.5:1 |
| Linux (GNOME) | Settings → Accessibility → High Contrast | UI elements distinct |

---

## Cross-Platform Test Matrix

| Platform | OS | Browser | Node | Test Types |
|----------|-----|---------|------|------------|
| Arch Linux | Native | Firefox 130+ | 24.21.0 | Automated + Manual |
| Arch Linux | Native | Chromium 130+ | 24.21.0 | Automated + Manual |
| WSL2 | Ubuntu 24.04 | Firefox | 24.21.0 | Manual |
| WSL2 | Ubuntu 24.04 | Chromium | 24.21.0 | Automated |

**Commands for each platform**:
```bash
# Arch Linux (native)
fnm use 24.21.0
npm ci
npm run build
npm run test:browser

# WSL2 (Ubuntu)
curl -fsSL https://fnm.vercel.app/install | bash
fnm use 24.21.0
npm ci
npm run build
npm run test:browser
```

---

## Slow Network / Recovery Tests

```bash
# Chrome DevTools → Network → Throttling → "Fast 3G" (1.6 Mbps / 150ms RTT)
# Or use: npx playwright test --project=chromium --network=slow-3g
```

| Scenario | Expected |
|----------|----------|
| Form save on 3G | Progress indicator shows; save completes |
| Submission timeout | "Check saved result" button appears |
| Retry after lost response | No duplicate submission; shows receipt |
| Offline → online | Queued actions sync |

---

## Evidence Collection Checklist

| Artifact | Location | Collected |
|----------|----------|-----------|
| Axe HTML report | `playwright-report/a11y/` | |
| Keyboard navigation video | `test-results/keyboard/` | |
| Screen reader session log | `test-results/screen-reader/` | |
| 390px mobile screenshots | `test-results/mobile/` | |
| 200%/400% zoom screenshots | `test-results/zoom/` | |
| High contrast screenshots | `test-results/high-contrast/` | |
| Slow network traces | `test-results/slow-network/` | |

---

## CI Integration (GitHub Actions)

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24.21.0'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:browser
      - run: npx playwright test tests/accessibility/ --reporter=github
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-report
          path: playwright-report/
```

---

## Definition of Done

- [ ] All automated axe-core tests pass (0 violations)
- [ ] Keyboard-only navigation works on all key pages
- [ ] Screen reader announces labels, errors, live regions
- [ ] 200% zoom: no horizontal overflow
- [ ] 400% zoom: content reflows
- [ ] 390px mobile: touch targets ≥ 44×44px
- [ ] Reduced motion respected
- [ ] High contrast mode usable
- [ ] Slow network (3G): forms save, recovery works
- [ ] Cross-platform: Arch + WSL produce identical results
- [ ] Evidence artifacts collected and stored

---

## Quick Start Commands

```bash
# 1. Setup
cd development/
npm ci
npm run build --workspace=@sis/config
node scripts/with-env.mjs prisma migrate deploy
ALLOW_DEMO_SEED=true node scripts/with-env.mjs node prisma/seed/seed.ts

# 2. Start services (2 terminals)
node scripts/with-env.mjs npm run start:dev --workspace=apps/api  # Terminal 1
node scripts/with-env.mjs npm run dev --workspace=apps/web -- --port 3100  # Terminal 2

# 3. Run automated a11y tests
npm install -D @axe-core/playwright
npx playwright test tests/accessibility/ --reporter=html

# 4. Run browser tests (390px, keyboard, no localStorage)
npm run test:browser

# 5. Manual tests per checklist above
```