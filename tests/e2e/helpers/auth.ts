import { Page } from '@playwright/test';

const E2E_USERNAME = 'e2e_test_user';
const E2E_PASSWORD = 'E2eTestPass123!';

/**
 * Registers the shared E2E test user via API (idempotent — ignores "user already exists"),
 * then logs in via the browser UI's LoginForm, and waits for the main Dashboard to appear.
 * Call this at the top of every E2E test before interacting with any nav elements.
 */
export async function loginE2E(page: Page, baseURL: string = 'http://localhost:3000') {
  // Register (safe to call repeatedly — 400 "User already exists" is fine)
  await fetch(`${baseURL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: E2E_USERNAME, password: E2E_PASSWORD }),
  }).catch(() => {});

  await page.goto('/');
  await page.locator('body').waitFor({ state: 'visible' });

  // If already authenticated (app shows sidebar), skip login
  const isLoggedIn = await page.locator('text=Dashboard').first().isVisible({ timeout: 2000 }).catch(() => false);
  if (isLoggedIn) return;

  // Toggle to Login view if on Register view
  const isCreateAccountView = await page.locator('h2:text("Create Account")').isVisible().catch(() => false);
  if (isCreateAccountView) {
    const loginToggleBtn = page.locator('button:text("Already have an account? Login")');
    if (await loginToggleBtn.isVisible().catch(() => false)) {
      await loginToggleBtn.click();
    }
  }

  await page.locator('input[type="text"]').first().fill(E2E_USERNAME);
  await page.locator('input[type="password"]').first().fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Wait until main app shell is visible (Sidebar renders Dashboard button)
  await page.waitForFunction(
    () => document.querySelector('body')?.innerText.includes('Dashboard'),
    { timeout: 15000 }
  );
}
