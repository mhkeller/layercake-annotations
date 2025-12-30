import { test, expect } from '@playwright/test';

/**
 * Test scenarios:
 * 1. One text annotation (with arrow already configured in data)
 * 2. An edited text annotation
 * 3. A resized text annotation (text wraps to multiple lines)
 *
 * Each scenario tested across:
 * - Linear chart (continuous scales) × Edit mode
 * - Linear chart (continuous scales) × Static mode
 * - Ordinal chart (band scale) × Edit mode
 * - Ordinal chart (band scale) × Static mode
 */

const chartTypes = [
	{ name: 'linear', selector: '.chart-container.line' },
	{ name: 'ordinal', selector: '.chart-container.ordinal' }
];

const modes = ['edit', 'static'];

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
});

/**
 * Helper to set edit mode on/off
 */
async function setEditMode(page, enabled) {
	const checkbox = page.locator('input[type="checkbox"]');
	const isChecked = await checkbox.isChecked();
	if (isChecked !== enabled) {
		await checkbox.click();
		await page.waitForTimeout(500);
	}
}

/**
 * Helper to get the chart locator
 */
function getChart(page, chartType) {
	const config = chartTypes.find((c) => c.name === chartType);
	return page.locator(config.selector);
}

// =============================================================================
// SCENARIO 1: Text annotation with arrow (pre-configured in data)
// =============================================================================

for (const chartType of chartTypes) {
	for (const mode of modes) {
		test(`text with arrow - ${chartType.name} - ${mode}`, async ({ page }) => {
			await setEditMode(page, mode === 'edit');

			const chart = getChart(page, chartType.name);
			const annotation = chart.locator('.layercake-annotation').first();

			await expect(annotation).toBeVisible();

			// Hover to show the edit state UI (red border) in edit mode
			if (mode === 'edit') {
				const draggable = chart.locator('.draggable').first();
				await draggable.hover({ force: true });
				await page.waitForTimeout(100);
			}

			await expect(chart).toHaveScreenshot(`1-text-arrow-${chartType.name}-${mode}.png`);
		});
	}
}

// =============================================================================
// SCENARIO 2: Edited text annotation
// =============================================================================

for (const chartType of chartTypes) {
	for (const mode of modes) {
		test(`edited text - ${chartType.name} - ${mode}`, async ({ page }) => {
			// Start in edit mode to edit text
			await setEditMode(page, true);

			const chart = getChart(page, chartType.name);
			const annotation = chart.locator('.layercake-annotation').first();

			// Double-click to enter edit mode
			await annotation.dblclick({ force: true });
			await page.waitForTimeout(100);

			// Clear and type new text
			await page.keyboard.press('Meta+a');
			await page.keyboard.type('Edited');
			await page.keyboard.press('Escape');
			await page.waitForTimeout(300);

			// Switch to target mode if needed
			await setEditMode(page, mode === 'edit');

			await expect(chart).toHaveScreenshot(`2-edited-${chartType.name}-${mode}.png`);
		});
	}
}

// =============================================================================
// SCENARIO 3: Resized annotation (text wraps to multiple lines)
// =============================================================================

for (const chartType of chartTypes) {
	for (const mode of modes) {
		test(`resized annotation - ${chartType.name} - ${mode}`, async ({ page }) => {
			// Start in edit mode to resize
			await setEditMode(page, true);

			const chart = getChart(page, chartType.name);
			const draggable = chart.locator('.draggable').first();

			// Hover to show resize handles
			await draggable.hover({ force: true });
			await page.waitForTimeout(200);

			// Find the east (right) resize handle
			const grabber = chart.locator('.grabber.east').first();
			const grabberBox = await grabber.boundingBox();

			// Drag the grabber left to make the annotation narrower (force text to wrap)
			await page.mouse.move(
				grabberBox.x + grabberBox.width / 2,
				grabberBox.y + grabberBox.height / 2
			);
			await page.mouse.down();
			await page.mouse.move(grabberBox.x - 70, grabberBox.y);
			await page.mouse.up();
			await page.waitForTimeout(200);

			// Switch to target mode if needed
			await setEditMode(page, mode === 'edit');

			await expect(chart).toHaveScreenshot(`3-resized-${chartType.name}-${mode}.png`);
		});
	}
}

// =============================================================================
// SCENARIO 4: Custom inline style on annotation
// =============================================================================

for (const mode of modes) {
	test(`custom style - ${mode}`, async ({ page }) => {
		// Start in edit mode to add a new annotation
		await setEditMode(page, true);

		const chart = getChart(page, 'linear');

		// Click to add a new annotation
		await chart.click({ position: { x: 600, y: 100 } });
		await page.waitForTimeout(300);

		// Add custom style to the new annotation via JavaScript
		await page.evaluate(() => {
			const annotations = document.querySelectorAll('.chart-container.line .layercake-annotation');
			const newAnnotation = /** @type {HTMLElement} */ (annotations[annotations.length - 1]);
			if (newAnnotation) {
				newAnnotation.style.background = 'yellow';
				newAnnotation.style.padding = '4px';
				newAnnotation.style.borderRadius = '4px';
			}
		});
		await page.waitForTimeout(100);

		// Verify the style was applied
		const styledAnnotation = chart.locator('.layercake-annotation').last();
		await expect(styledAnnotation).toBeVisible();

		// Switch to target mode if needed
		await setEditMode(page, mode === 'edit');

		await expect(chart).toHaveScreenshot(`4-custom-style-${mode}.png`);
	});
}
