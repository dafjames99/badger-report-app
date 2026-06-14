import { test, expect, type Page } from '@playwright/test';

// Intercept the API so tests don't need real Google Sheets / email credentials
test.beforeEach(async ({ page }) => {
  await page.route('/api/reports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Report processed successfully' }),
    });
  });
});

async function waitForApp(page: Page) {
  // Verify the actual app has loaded — fails fast if Vercel auth is blocking the page
  await expect(page.getByRole('heading', { name: /badger report/i })).toBeVisible({ timeout: 15_000 });
}

async function fillRequiredFields(page: Page) {
  await page.getByRole('button', { name: /select on map/i }).click();
  const mapContainer = page.locator('.leaflet-container');
  await mapContainer.waitFor();
  await mapContainer.click({ position: { x: 200, y: 150 } });
  await page.getByRole('button', { name: /^yes$/i }).click();
}

test.describe('Report form', () => {
  test('submit button is disabled until location and suitability are set', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const submitBtn = page.getByRole('button', { name: /dispatch report/i });
    await expect(submitBtn).toBeDisabled();

    await page.getByRole('button', { name: /select on map/i }).click();
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.waitFor();
    await mapContainer.click({ position: { x: 200, y: 150 } });

    // Still disabled — suitability not set yet
    await expect(submitBtn).toBeDisabled();

    await page.getByRole('button', { name: /^yes$/i }).click();
    await expect(submitBtn).toBeEnabled();
  });

  test('happy path: shows "submitted successfully" and fires POST immediately', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    const postedRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/reports') && req.method() === 'POST') {
        postedRequests.push(req.url());
      }
    });

    await fillRequiredFields(page);
    await page.getByRole('button', { name: /dispatch report/i }).click();

    await expect(page.getByText(/report submitted successfully/i)).toBeVisible();
    expect(postedRequests).toHaveLength(1);
  });

  test('offline: shows "saved" banner and does not POST to server', async ({ page, context }) => {
    await page.goto('/');
    await waitForApp(page);
    await context.setOffline(true);

    const postedRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/reports') && req.method() === 'POST') {
        postedRequests.push(req.url());
      }
    });

    await fillRequiredFields(page);
    await page.getByRole('button', { name: /dispatch report/i }).click();

    await expect(page.getByText(/will upload when connection is available/i)).toBeVisible();
    expect(postedRequests).toHaveLength(0);
  });

  test('server error: shows "saved" banner (report queued for retry)', async ({ page }) => {
    await page.route('/api/reports', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    await page.goto('/');
    await waitForApp(page);
    await fillRequiredFields(page);
    await page.getByRole('button', { name: /dispatch report/i }).click();

    await expect(page.getByText(/will upload when connection is available/i)).toBeVisible();
  });

  test('form validation: cannot submit without suitability answer', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    await page.getByRole('button', { name: /select on map/i }).click();
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.waitFor();
    await mapContainer.click({ position: { x: 200, y: 150 } });

    await expect(page.getByRole('button', { name: /dispatch report/i })).toBeDisabled();
  });
});
