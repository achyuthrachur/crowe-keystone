import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Phase 5 — LangGraph Engine (frontend smoke tests)
// Dev server: http://localhost:3002  |  Backend: not running in test env
// ---------------------------------------------------------------------------

test.describe('Phase 5 — Projects page (agent panel hidden state)', () => {
  test('/projects page loads without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects');
    await expect(
      page.locator('[data-testid="project-card"]').first()
    ).toBeVisible({ timeout: 10000 });

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/projects page renders all 5 mock project cards', async ({ page }) => {
    await page.goto('/projects');
    const cards = page.locator('[data-testid="project-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await expect(cards).toHaveCount(5);
  });

  test('project detail page loads without JS errors (agent store does not crash)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Navigate to project detail — agent store should initialize cleanly
    await page.goto('/projects/1');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});

test.describe('Phase 5 — Settings: Approval Chains page', () => {
  test('/settings/approval-chains page loads without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/settings/approval-chains');
    await expect(
      page.getByRole('heading', { name: /approval chains/i })
    ).toBeVisible({ timeout: 10000 });

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/settings/approval-chains renders Approval Chains heading', async ({ page }) => {
    await page.goto('/settings/approval-chains');
    await expect(
      page.getByRole('heading', { name: /approval chains/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('/settings/approval-chains renders configuration description', async ({ page }) => {
    await page.goto('/settings/approval-chains');
    await expect(
      page.locator('text=/Configure which stage transitions require approval/i')
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 5 — Agent types compilation check', () => {
  test('navigating between project detail pages does not cause agent store crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects/1');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.goto('/projects/2');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('all main pages load without JS errors (full navigation smoke)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const routes = ['/projects', '/inbox', '/graph', '/daily', '/memory'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    }

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/settings pages all load without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const routes = [
      '/settings/notifications',
      '/settings/approval-chains',
      '/settings/team',
    ];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    }

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
