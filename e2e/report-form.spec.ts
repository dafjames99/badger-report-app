import { test, expect } from '@playwright/test';

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

async function fillRequiredFields(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  // Select "Use current location" and wait for GPS or mock it
  // In CI there's no real GPS, so we use the map picker instead
  await page.getByRole('button', { name: /select on map/i }).click();
  // Click the map to place a pin — Leaflet canvas/div is the target
  const mapContainer = page.locator('.leaflet-container');
  await mapContainer.waitFor();
  await mapContainer.click({ position: { x: 200, y: 150 } });

  // Set suitability
  await page.getByRole('button', { name: /^yes$/i }).click();
}

test.describe('Report form', () => {
  test('submit button is disabled until location and suitability are set', async ({ page }) => {
    await page.goto('/');
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
    // Override the route to return a 500
    await page.route('/api/reports', async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    await page.goto('/');
    await fillRequiredFields(page);
    await page.getByRole('button', { name: /dispatch report/i }).click();

    await expect(page.getByText(/will upload when connection is available/i)).toBeVisible();
  });

  test('form validation: cannot submit without suitability answer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /select on map/i }).click();
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.waitFor();
    await mapContainer.click({ position: { x: 200, y: 150 } });

    // Suitability not set — button must remain disabled
    await expect(page.getByRole('button', { name: /dispatch report/i })).toBeDisabled();
  });
});
