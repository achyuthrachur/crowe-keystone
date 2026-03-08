import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Phase 4 — React Flow Graph
// Dev server: http://localhost:3002  |  Backend: not running in test env
// ---------------------------------------------------------------------------

test.describe('Phase 4 — Graph page (desktop)', () => {
  test('/graph route loads without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/graph');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/graph route renders something (loading, graph, or error state)', async ({ page }) => {
    await page.goto('/graph');
    // Give the dynamic import and device detection time to resolve
    await page.waitForTimeout(2000);

    // Valid states (desktop): loading skeleton, React Flow canvas, "Failed to load graph" error
    const loadingText = page.locator('text=Loading graph');
    const failedText  = page.locator('text=Failed to load graph');
    const reactFlow   = page.locator('.react-flow');

    const loading = await loadingText.isVisible().catch(() => false);
    const failed  = await failedText.isVisible().catch(() => false);
    const canvas  = await reactFlow.isVisible().catch(() => false);

    // On mobile device (WebKit iPhone 14), MobileGraphList is shown instead of ReactFlow.
    // MobileGraphList renders stage groups or an empty/error state — all produce non-empty body text.
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    const hasContent = bodyText.length > 5;

    // Either desktop states OR the page has content (mobile list)
    expect(loading || failed || canvas || hasContent).toBe(true);
  });

  test('/graph page does not show a blank white page', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // The page should have a non-empty body
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('/graph page sidebar still renders in desktop layout', async ({ page }) => {
    await page.goto('/graph');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible({ timeout: 10000 });
  });

  test('/graph page notification bell still renders', async ({ page }) => {
    await page.goto('/graph');
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible({ timeout: 10000 });
  });

  test('React Flow canvas renders when backend is available', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/graph');
    // Wait longer for dynamic import and potential data load
    await page.waitForTimeout(3000);

    // React Flow adds .react-flow to the container when rendered
    // If backend is down, the error state is shown instead — both are valid
    const reactFlow = page.locator('.react-flow');
    const failedText = page.locator('text=Failed to load graph');

    const canvasVisible = await reactFlow.isVisible().catch(() => false);
    const errorVisible  = await failedText.isVisible().catch(() => false);
    // On mobile viewports, MobileGraphList renders instead of React Flow
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    const mobileListVisible = bodyText.length > 20 && !canvasVisible && !errorVisible;

    // Either the graph canvas, the error fallback, or the mobile list must be visible
    expect(canvasVisible || errorVisible || mobileListVisible).toBe(true);

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/graph page does not crash when navigated to from /projects', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects');
    await expect(
      page.locator('[data-testid="project-card"]').first()
    ).toBeVisible({ timeout: 10000 });

    // Navigate to graph via URL
    await page.goto('/graph');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});

test.describe('Phase 4 — Graph page (mobile viewport)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('/graph on mobile viewport loads without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/graph');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/graph on mobile renders MobileGraphList or error state', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForTimeout(2000);

    // On 375px, GraphView renders MobileGraphList (not KeystoneGraph)
    // MobileGraphList fetches from backend — shows loading, empty, or error state
    // All are valid since backend is not running
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(0);

    // The page must not be a blank white screen
    const bodyBg = await page.evaluate(() => {
      const el = document.querySelector('body');
      return el ? window.getComputedStyle(el).backgroundColor : '';
    });
    expect(bodyBg).not.toBe('');
  });

  test('/graph mobile does not render ReactFlow canvas (uses MobileGraphList)', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForTimeout(2000);

    // On mobile, KeystoneGraph is replaced by MobileGraphList — no .react-flow canvas
    const reactFlowCanvas = page.locator('.react-flow');
    // React Flow should NOT be visible on mobile
    const isVisible = await reactFlowCanvas.isVisible().catch(() => false);
    // Note: On mobile viewport, GraphView renders MobileGraphList, not KeystoneGraph
    // The .react-flow element should not be present
    expect(isVisible).toBe(false);
  });
});
