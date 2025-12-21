import { test, expect } from '@playwright/test';

test.describe('LayerCake Annotations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for the chart to render
		await page.waitForSelector('.chart-container');
	});

	test('initial chart renders correctly', async ({ page }) => {
		// Take a screenshot of the initial state
		await expect(page.locator('.chart-container')).toHaveScreenshot('initial-chart.png');
	});

	test('existing annotation is visible', async ({ page }) => {
		// The demo page has an existing annotation
		const annotation = page.locator('.layercake-annotation');
		await expect(annotation).toBeVisible();
		await expect(annotation).toContainText('Existing annotation');
	});

	test('can create a new annotation by clicking', async ({ page }) => {
		// Click on the chart area to create a new annotation
		const chart = page.locator('.note-listener');
		await chart.click({ position: { x: 200, y: 100 } });

		// Wait for the new annotation
		await page.waitForTimeout(300); // debounce delay

		// Should now have 2 annotations
		const annotations = page.locator('.layercake-annotation');
		await expect(annotations).toHaveCount(2);

		// Take screenshot with new annotation
		await expect(page.locator('.chart-container')).toHaveScreenshot('new-annotation.png');
	});

	test('annotation text is editable', async ({ page }) => {
		const annotation = page.locator('.layercake-annotation').first();

		// Double-click to edit
		await annotation.dblclick();

		// Type new text
		await page.keyboard.press('Control+a');
		await page.keyboard.type('Updated text');

		// Click outside to finish editing
		await page.locator('.chart-container').click({ position: { x: 10, y: 10 } });

		await expect(annotation).toContainText('Updated text');
	});

	test('arrow zones appear on hover', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover over the annotation
		await annotation.hover();

		// Wait for transition
		await page.waitForTimeout(300);

		// Arrow zones should be visible
		const arrowZones = page.locator('.arrow-zone');
		await expect(arrowZones).toHaveCount(2); // west and east

		// Take screenshot with arrow zones visible
		await expect(page.locator('.chart-container')).toHaveScreenshot('hover-arrow-zones.png');
	});

	test('can create west arrow by dragging', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover to show arrow zones
		await annotation.hover();
		await page.waitForTimeout(300);

		// Find the west arrow zone
		const westZone = page.locator('.arrow-zone.west');

		// Drag from west zone to create an arrow
		const box = await westZone.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x - 100, box.y + 50, { steps: 10 });
			await page.mouse.up();
		}

		// Wait for arrow to render
		await page.waitForTimeout(100);

		// Should have an arrow path
		const arrowPath = page.locator('.swoops path');
		await expect(arrowPath).toHaveCount(1);

		// Take screenshot with arrow
		await expect(page.locator('.chart-container')).toHaveScreenshot('west-arrow.png');
	});

	test('can create east arrow by dragging', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover to show arrow zones
		await annotation.hover();
		await page.waitForTimeout(300);

		// Find the east arrow zone
		const eastZone = page.locator('.arrow-zone.east');

		// Drag from east zone to create an arrow
		const box = await eastZone.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 100, box.y - 50, { steps: 10 });
			await page.mouse.up();
		}

		// Wait for arrow to render
		await page.waitForTimeout(100);

		// Should have an arrow path
		const arrowPath = page.locator('.swoops path');
		await expect(arrowPath).toHaveCount(1);

		// Take screenshot with arrow
		await expect(page.locator('.chart-container')).toHaveScreenshot('east-arrow.png');
	});

	test('can create both west and east arrows', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Create west arrow
		await annotation.hover();
		await page.waitForTimeout(300);

		const westZone = page.locator('.arrow-zone.west');
		let box = await westZone.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x - 80, box.y + 30, { steps: 10 });
			await page.mouse.up();
		}

		// Create east arrow
		await annotation.hover();
		await page.waitForTimeout(300);

		const eastZone = page.locator('.arrow-zone.east');
		box = await eastZone.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 80, box.y - 30, { steps: 10 });
			await page.mouse.up();
		}

		await page.waitForTimeout(100);

		// Should have two arrow paths
		const arrowPaths = page.locator('.swoops path');
		await expect(arrowPaths).toHaveCount(2);

		// Take screenshot with both arrows
		await expect(page.locator('.chart-container')).toHaveScreenshot('both-arrows.png');
	});

	test('can drag annotation to new position', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Get initial position
		const initialBox = await annotation.boundingBox();

		// Drag the annotation
		if (initialBox) {
			await page.mouse.move(
				initialBox.x + initialBox.width / 2,
				initialBox.y + initialBox.height / 2
			);
			await page.mouse.down();
			await page.mouse.move(initialBox.x + 100, initialBox.y + 50, { steps: 10 });
			await page.mouse.up();
		}

		// Get new position
		const newBox = await annotation.boundingBox();

		// Position should have changed
		expect(newBox?.x).not.toBe(initialBox?.x);
		expect(newBox?.y).not.toBe(initialBox?.y);

		// Take screenshot after drag
		await expect(page.locator('.chart-container')).toHaveScreenshot('dragged-annotation.png');
	});

	test('can delete annotation with backspace', async ({ page }) => {
		// First verify we have one annotation
		let annotations = page.locator('.layercake-annotation');
		await expect(annotations).toHaveCount(1);

		// Hover over annotation to set hovering state
		const annotation = page.locator('.draggable').first();
		await annotation.hover();

		// Press backspace to delete
		await page.keyboard.press('Backspace');

		// Annotation should be deleted
		annotations = page.locator('.layercake-annotation');
		await expect(annotations).toHaveCount(0);

		// Take screenshot with no annotations
		await expect(page.locator('.chart-container')).toHaveScreenshot('deleted-annotation.png');
	});

	test('can toggle edit mode', async ({ page }) => {
		// Uncheck the edit checkbox
		const checkbox = page.locator('input[type="checkbox"]');
		await checkbox.uncheck();

		// In static mode, should not have draggable class behaviors
		// but annotation should still be visible
		const annotation = page.locator('.layercake-annotation');
		await expect(annotation).toBeVisible();

		// Take screenshot in static mode
		await expect(page.locator('.chart-container')).toHaveScreenshot('static-mode.png');
	});

	test('annotation appearance is consistent across edit mode toggles', async ({ page }) => {
		const chart = page.locator('.chart-container');
		const checkbox = page.locator('input[type="checkbox"]');

		// Wait for stable render
		await page.waitForTimeout(200);

		// Step 1: Initial edit mode
		await page.mouse.move(0, 0);
		await expect(chart).toHaveScreenshot('toggle-1-initial.png');

		// Step 2: Toggle to static mode
		await checkbox.uncheck();
		await page.waitForTimeout(200);
		await page.mouse.move(0, 0);
		await expect(chart).toHaveScreenshot('toggle-2-static.png');

		// Step 3: Toggle back to edit mode
		await checkbox.check();
		await page.waitForTimeout(200);
		await page.mouse.move(0, 0);
		await expect(chart).toHaveScreenshot('toggle-3-edit-again.png');
	});

	test('arrow follows mouse during drag without drift', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover to show arrow zones
		await annotation.hover();
		await page.waitForTimeout(300);

		// Start dragging from east zone
		const eastZone = page.locator('.arrow-zone.east');
		const box = await eastZone.boundingBox();

		if (box) {
			const startX = box.x + box.width / 2;
			const startY = box.y + box.height / 2;

			await page.mouse.move(startX, startY);
			await page.mouse.down();

			// Move in steps and take screenshots to verify no drift
			const steps = [
				{ x: startX + 30, y: startY },
				{ x: startX + 60, y: startY - 20 },
				{ x: startX + 90, y: startY - 40 }
			];

			for (let i = 0; i < steps.length; i++) {
				await page.mouse.move(steps[i].x, steps[i].y);
				await page.waitForTimeout(50);
				await expect(page.locator('.chart-container')).toHaveScreenshot(`drag-step-${i}.png`);
			}

			await page.mouse.up();
		}
	});
});
