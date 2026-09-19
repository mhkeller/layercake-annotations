import { test, expect } from '@playwright/test';

/**
 * Test scenarios:
 * 1. One text annotation (with arrow already configured in data)
 * 2. An edited text annotation
 * 3. A resized text annotation (widened until its text fits on one line)
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
});

/**
 * Helper to set edit mode on/off for one chart. Each chart has its own switch, in
 * the corner of its frame.
 */
async function setEditMode(page, chartType, enabled) {
	const chart = getChart(page, chartType);
	const checkbox = chart.getByRole('checkbox');
	await checkbox.scrollIntoViewIfNeeded();
	const isChecked = await checkbox.isChecked();
	if (isChecked !== enabled) {
		await checkbox.click();
		await page.waitForTimeout(500);
	}
	// Each mode draws its own box, so a box in the chart says the switch landed. On
	// a call that changes nothing it says the chart has finished measuring itself,
	// which is the thing worth waiting for: Layer Cake draws nothing until then.
	await expect(chart.locator(enabled ? '.draggable' : '.static-wrapper').first()).toBeAttached();
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
			await setEditMode(page, chartType.name, mode === 'edit');

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
			await setEditMode(page, chartType.name, true);

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
			await setEditMode(page, chartType.name, mode === 'edit');

			await expect(chart).toHaveScreenshot(`2-edited-${chartType.name}-${mode}.png`);
		});
	}
}

// =============================================================================
// SCENARIO 3: Resized annotation
// =============================================================================

// Wide enough to rewrap each chart's first note: "Annotation text" onto one line,
// and "A counter-clockwise arrow" onto a different two. At the line chart's 100px
// the text already wraps as far as it can, so narrowing would only push it out of
// the box.
const RESIZED_WIDTH = 160;

for (const chartType of chartTypes) {
	for (const mode of modes) {
		test(`resized annotation - ${chartType.name} - ${mode}`, async ({ page }) => {
			// The resize happens in edit mode either way. The mode being tested is the
			// one the screenshot is taken in.
			await setEditMode(page, chartType.name, true);

			const chart = getChart(page, chartType.name);
			const draggable = chart.locator('.draggable').first();

			// Hover to show the resize handles
			await draggable.hover({ force: true });

			const grabber = chart.locator('.grabber.east').first();
			const grabberBox = await grabber.boundingBox();
			const width = await draggable.evaluate((el) => el.getBoundingClientRect().width);
			const x = grabberBox.x + grabberBox.width / 2;
			const y = grabberBox.y + grabberBox.height / 2;

			// Drag the east edge out by exactly the difference. A move that asks for
			// less than the 50px minimum is ignored outright, so the distance has to
			// come from the box rather than being a fixed guess.
			await page.mouse.move(x, y);
			await page.mouse.down();
			await page.mouse.move(x + RESIZED_WIDTH - width, y);
			await page.mouse.up();

			// A drag that doesn't land has to fail here, not pass by matching an
			// unresized screenshot.
			await expect(draggable).toHaveCSS('width', `${RESIZED_WIDTH}px`);

			await setEditMode(page, chartType.name, mode === 'edit');

			// Static mode draws its own box, from the width the resize stored.
			await expect(
				chart.locator(mode === 'edit' ? '.draggable' : '.static-wrapper').first()
			).toHaveCSS('width', `${RESIZED_WIDTH}px`);

			await expect(chart).toHaveScreenshot(`3-resized-${chartType.name}-${mode}.png`);
		});
	}
}

// =============================================================================
// SCENARIO 4: Custom inline style on annotation
// =============================================================================

for (const mode of modes) {
	test(`custom style - ${mode}`, async ({ page }) => {
		// The style goes on in edit mode either way. The mode being tested is the one
		// the screenshot is taken in.
		await setEditMode(page, 'linear', true);

		const chart = getChart(page, 'linear');
		const annotation = chart.locator('.layercake-annotation').first();
		await expect(annotation).toBeVisible();

		// Click the annotation itself: a click on bare chart would make a second one.
		// The click leaves it hovered, and the hover is part of the baseline.
		await annotation.click({ force: true });
		await expect(chart.locator('.anchor-indicator')).toBeVisible();

		await annotation.evaluate((el) => {
			el.style.background = 'yellow';
			el.style.padding = '4px';
			el.style.borderRadius = '4px';
		});
		// Assert the style landed. Without this the screenshot is the only thing
		// checking it, and a screenshot can't say why it differs.
		await expect(annotation).toHaveCSS('background-color', 'rgb(255, 255, 0)');

		// Static mode builds its own elements, so it drops the inline style — the
		// static baseline is this annotation unstyled.
		await setEditMode(page, 'linear', mode === 'edit');

		await expect(chart).toHaveScreenshot(`4-custom-style-${mode}.png`);
	});
}
