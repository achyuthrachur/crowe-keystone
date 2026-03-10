import { test, expect } from '@playwright/test';

test.describe('/install page', () => {
  test('install page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/install');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const fatal = errors.filter(e =>
      !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch')
    );
    expect(fatal).toHaveLength(0);
  });

  test('install page shows Install heading', async ({ page }) => {
    await page.goto('/install');
    await expect(
      page.getByRole('heading', { name: /install/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('install page renders QR code', async ({ page }) => {
    await page.goto('/install');
    await page.waitForTimeout(500);
    const qr = page.locator('canvas, svg').first();
    await expect(qr).toBeVisible({ timeout: 5000 });
  });

  test('install page shows iOS instructions', async ({ page }) => {
    await page.goto('/install');
    const iosContent = page.locator('text=/safari/i').first();
    await expect(iosContent).toBeVisible({ timeout: 5000 });
  });

  test('install page shows Android instructions', async ({ page }) => {
    await page.goto('/install');
    const androidContent = page.locator('text=/android|chrome/i').first();
    await expect(androidContent).toBeVisible({ timeout: 5000 });
  });

  test('install page is accessible without login', async ({ page }) => {
    await page.goto('/install');
    expect(page.url()).not.toContain('/auth/login');
  });

  test('mobile: install page renders correctly at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/install');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
    const fatal = errors.filter(e =>
      !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch')
    );
    expect(fatal).toHaveLength(0);
  });
});
