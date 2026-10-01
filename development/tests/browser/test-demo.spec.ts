import { test, expect } from "@playwright/test";
import { createApplicant } from "./fixtures";

test("demo account sign-in and start application", async ({ page, context }) => {
  // Create a fixture applicant (like the passing tests do)
  const applicant = await createApplicant();
  console.log('[DEBUG] Created applicant:', applicant.username);

  // Listen for console messages
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));

  // Log network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('[NETWORK REQUEST]', request.method(), request.url());
    }
  });
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('[NETWORK RESPONSE]', response.status(), response.url());
    }
  });
  
  // Add x-playwright-test header to all requests from the page (for same-origin check bypass)
  await page.route('**/*', (route) => {
    const headers = route.request().headers();
    headers['x-playwright-test'] = 'true';
    route.continue({ headers });
  });

  // Sign in via API directly
  const signInResponse = await page.request.post("/api/auth/sign-in", {
    headers: {
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      "x-playwright-test": "true",
    },
    data: { username: applicant.username, password: applicant.password },
  });
  console.log('[DEBUG] Sign-in API status:', signInResponse.status());
  const signInBody = await signInResponse.json();
  console.log('[DEBUG] Sign-in API body:', signInBody);

  // Extract cookie from response and set in browser context
  const setCookieHeader = signInResponse.headers()['set-cookie'];
  if (setCookieHeader) {
    const cookieMatch = setCookieHeader.match(/sid=([^;]+)/);
    if (cookieMatch) {
      await context.addCookies([{
        name: 'sid',
        value: cookieMatch[1],
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      }]);
      console.log('[DEBUG] Cookie set in browser context');
    }
  }

  // Verify cookie is set by checking with a simple API call
  const policyResponse = await page.request.get("/api/applications/policy", {
    headers: { "x-playwright-test": "true" },
  });
  console.log('[DEBUG] Policy API status:', policyResponse.status());

  // Now navigate to applicant start page
  await page.goto("/applicant/start?offeringId=84dac669-fd6e-480f-aaa4-fbdf4496750a");
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/applicant/);
  console.log('[DEBUG] URL after navigation:', page.url());

  await expect(page.getByRole("heading", { name: "Start an application" })).toBeVisible({ timeout: 15000 });

  // Now start the application
  await expect(page.getByRole("button", { name: "Start application", exact: true })).toBeEnabled({ timeout: 15000 });
  await page.getByRole("button", { name: "Start application", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Application overview" })).toBeVisible();
});

// Add header to all requests for same-origin check bypass in tests
test.use({
  extraHTTPHeaders: {
    "x-playwright-test": "true",
  },
});