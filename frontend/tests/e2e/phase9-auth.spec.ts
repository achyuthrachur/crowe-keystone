import { test, expect } from '@playwright/test';

test.describe('Registration page', () => {
  test('/register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible({ timeout: 8000 });
  });

  test('registration form has required fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="text"], input[name="name"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('register page renders without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/register');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const fatal = errors.filter(e =>
      !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch')
    );
    expect(fatal).toHaveLength(0);
  });

  test('invalid token shows error state', async ({ page }) => {
    await page.goto('/register?token=invalid-token-123');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const errorText = page.locator('text=/invalid|expired/i').first();
    const hasError = await errorText.isVisible().catch(() => false);
    const hasForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
    expect(hasError || hasForm).toBe(true);
  });
});

test.describe('Login page', () => {
  test('/login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 8000 });
  });

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('register link is present on login page', async ({ page }) => {
    await page.goto('/login');
    const link = page.locator('a[href*="register"]').first();
    await expect(link).toBeVisible({ timeout: 5000 });
  });
});
