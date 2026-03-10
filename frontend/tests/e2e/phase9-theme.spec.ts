import { test, expect } from '@playwright/test';

test.describe('Theme system', () => {
  test('dark theme is default', async ({ page }) => {
    await page.goto('/projects');
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');
  });

  test('ThemeToggle is visible in TopBar', async ({ page }) => {
    await page.goto('/projects');
    const toggle = page.locator('[aria-label*="mode"]').first();
    await expect(toggle).toBeVisible({ timeout: 5000 });
  });

  test('clicking ThemeToggle switches to light mode', async ({ page }) => {
    await page.goto('/projects');
    const toggle = page.locator('[aria-label="Switch to light mode"]').first();
    await expect(toggle).toBeVisible({ timeout: 5000 });
    await toggle.click();
    await page.waitForTimeout(300);
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('light');
  });

  test('light mode page background is warm off-white not pure white', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('[aria-label="Switch to light mode"]').first().click();
    await page.waitForTimeout(300);
    const bg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('theme preference persists across page reload', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('[aria-label="Switch to light mode"]').first().click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(500);
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('light');
  });

  test('no FOUC — theme applies before first paint', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('keystone-theme', JSON.stringify({
        state: { preference: 'light' }
      }));
    });
    await page.goto('/projects');
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('light');
  });

  test('/settings has theme selector with 3 options', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'dark', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'light', exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'system', exact: true })).toBeVisible({ timeout: 5000 });
  });
});
