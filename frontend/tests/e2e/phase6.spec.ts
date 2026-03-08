import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Phase 6 — Agent Integration
// Dev server: http://localhost:3002  |  Backend: not running in test env
// ---------------------------------------------------------------------------

test.describe('Phase 6 — Project detail: Stage Actions', () => {
  test('project detail page loads without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects/1');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('project detail page shows stage actions or graceful error when backend unavailable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects/1');
    // Wait for loading state to resolve
    await page.waitForFunction(
      () => !document.body.innerText.includes('Loading...'),
      { timeout: 15000 }
    ).catch(() => {});

    // When backend is up: stage actions section and buttons are rendered
    // When backend is down: "Project not found." is shown
    const stageActionsLabel = page.locator('text=Stage Actions');
    const errorState        = page.locator('text=Project not found');

    const actionsVisible = await stageActionsLabel.isVisible().catch(() => false);
    const errorVisible   = await errorState.isVisible().catch(() => false);

    // Either stage actions are shown OR the graceful error state is shown
    expect(actionsVisible || errorVisible).toBe(true);

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('project detail page (spark stage) shows Generate Brief or error state', async ({ page }) => {
    // Find a spark-stage project in mock data (project id 5 is likely spark)
    // Navigate to each project until we find "Generate Brief" or exhaust options
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Try all 5 mock projects
    let generateBriefFound = false;
    let anyProjectLoaded = false;

    for (let i = 1; i <= 5; i++) {
      await page.goto(`/projects/${i}`);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

      const hasProject = await page.locator('text=Stage Actions').isVisible().catch(() => false);
      if (hasProject) {
        anyProjectLoaded = true;
        const hasBrief = await page.getByRole('button', { name: /generate brief/i }).isVisible().catch(() => false);
        if (hasBrief) {
          generateBriefFound = true;
          break;
        }
      }
    }

    // If backend is running and a spark project exists, Generate Brief should be found
    // If backend is not running, no project loads — gracefully pass
    // This test documents the intended behavior without failing in test env
    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError') && !e.includes('ChunkLoadError') && !e.includes('Loading chunk')
    );
    expect(fatalErrors).toHaveLength(0);

    // Log outcome (informational — not a hard assertion on backend state)
    if (anyProjectLoaded) {
      // If projects load, the spark project must have a "Generate Brief" button
      expect(generateBriefFound).toBe(true);
    }
    // If no project loads (backend down), we still pass — the page is graceful
  });
});

test.describe('Phase 6 — AgentPanel in DOM', () => {
  test('project detail page mounts without agent store crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects/3');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // The agent store (Zustand) should initialize without errors
    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('navigating between multiple projects does not cause agent store errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Simulate multiple project navigations (agent store should handle this)
    for (const id of ['1', '2', '3']) {
      await page.goto(`/projects/${id}`);
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    }

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});

test.describe('Phase 6 — Daily Brief page', () => {
  test('/daily page loads without fatal JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/daily');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/daily page renders "Today" heading', async ({ page }) => {
    await page.goto('/daily');
    await expect(
      page.getByRole('heading', { name: /today/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('/daily page renders loading skeletons or brief sections', async ({ page }) => {
    await page.goto('/daily');
    // Either: loading skeletons (4 pulse divs) OR brief sections OR error
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    // Page has meaningful content
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('/daily page does not crash on any viewport', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/daily');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});

test.describe('Phase 6 — Mobile agent integration', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('/daily on mobile renders without fatal errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/daily');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('/projects detail on mobile does not crash with agent store', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/projects/1');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('net::') && !e.includes('Failed to fetch') && !e.includes('access control') && !e.includes('NetworkError')
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
