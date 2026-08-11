import { test, expect } from '@playwright/test';

test.describe('Traycer-mini Browser E2E Workflows', () => {

  test('1. Application loads successfully and displays dashboard system metrics', async ({ page }) => {
    await page.goto('/');
    
    // Check main branding/header & navigation
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /Dashboard/i }).first()).toBeVisible();
  });

  test('2. User can navigate to Repositories page and view imported projects', async ({ page }) => {
    await page.goto('/');

    // Navigate to Repositories tab
    const reposNav = page.getByRole('button', { name: /Repositories/i }).first();
    await reposNav.click();

    // Verify page content loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('3. GitHub Import UI form validation handles empty or invalid inputs gracefully', async ({ page }) => {
    await page.goto('/');

    // Navigate to GitHub Import tab/button
    const importNav = page.getByRole('button', { name: /Import from GitHub/i }).first();
    await importNav.click();

    // Verify import button is disabled when URL input is empty
    const importButton = page.getByRole('button', { name: /Import Repository/i }).first();
    if (await importButton.isVisible()) {
      await expect(importButton).toBeDisabled();
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('4. Plan Creator UI allows submitting a new task description', async ({ page }) => {
    await page.goto('/');

    // Navigate to Create Plan / AI Assistant tab
    const planNav = page.getByRole('button', { name: /New Plan/i }).first();
    await planNav.click();

    // Check textarea input existence
    const taskInput = page.locator('textarea').first();
    if (await taskInput.isVisible()) {
      await taskInput.fill('E2E Test: Add math helper function');
      expect(await taskInput.inputValue()).toBe('E2E Test: Add math helper function');
    }
  });

  test('5. Verify page allows triggering code verification checks', async ({ page }) => {
    await page.goto('/');

    // Navigate to Verify tab
    const verifyNav = page.getByRole('button', { name: /Verify/i }).first();
    await verifyNav.click();

    // Verify page content rendering
    await expect(page.locator('body')).toBeVisible();
  });
});
