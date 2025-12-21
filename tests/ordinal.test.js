import { test, expect } from '@playwright/test';

test.describe('Ordinal Scale Annotations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/ordinal');
		// Wait for the chart to render
		await page.waitForSelector('.chart-container');
	});

	test('ordinal chart renders correctly', async ({ page }) => {
		// Take a screenshot of the initial state
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-initial-chart.png');
	});

	test('existing ordinal annotation is visible', async ({ page }) => {
		// The demo page has an existing annotation
		const annotation = page.locator('.layercake-annotation');
		await expect(annotation).toBeVisible();
		await expect(annotation).toContainText('Ordinal annotation');
	});

	test('can create annotation on ordinal chart', async ({ page }) => {
		// Click on the chart area to create a new annotation
		const chart = page.locator('.note-listener');
		await chart.click({ position: { x: 100, y: 150 } });

		// Wait for the new annotation
		await page.waitForTimeout(300);

		// Should now have 2 annotations
		const annotations = page.locator('.layercake-annotation');
		await expect(annotations).toHaveCount(2);

		// Take screenshot with new annotation
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-new-annotation.png');
	});

	test('arrow zones appear on hover in ordinal chart', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover over the annotation
		await annotation.hover();

		// Wait for transition
		await page.waitForTimeout(300);

		// Arrow zones should be visible
		const arrowZones = page.locator('.arrow-zone');
		await expect(arrowZones).toHaveCount(2); // west and east

		// Take screenshot with arrow zones visible
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-hover-arrow-zones.png');
	});

	test('can create west arrow on ordinal chart', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover to show arrow zones
		await annotation.hover();
		await page.waitForTimeout(300);

		// Find the west arrow zone
		const westZone = page.locator('.arrow-zone.west');

		// Drag from west zone to create an arrow pointing to another bar
		const box = await westZone.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			// Drag to the left to point to an earlier year's bar
			await page.mouse.move(box.x - 150, box.y + 80, { steps: 10 });
			await page.mouse.up();
		}

		// Wait for arrow to render
		await page.waitForTimeout(100);

		// Should have an arrow path (use .arrow-visible to exclude invisible hitarea paths)
		const arrowPath = page.locator('.arrow-visible');
		await expect(arrowPath).toHaveCount(1);

		// Take screenshot with arrow
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-west-arrow.png');
	});

	test('can create east arrow on ordinal chart', async ({ page }) => {
		const annotation = page.locator('.draggable').first();

		// Hover to show arrow zones
		await annotation.hover();
		await page.waitForTimeout(300);

		// Find the east arrow zone
		const eastZone = page.locator('.arrow-zone.east');

		// Drag from east zone to create an arrow pointing to another bar
		const box = await eastZone.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			// Drag to the right to point to a later year's bar
			await page.mouse.move(box.x + 100, box.y + 50, { steps: 10 });
			await page.mouse.up();
		}

		// Wait for arrow to render
		await page.waitForTimeout(100);

		// Should have an arrow path (use .arrow-visible to exclude invisible hitarea paths)
		const arrowPath = page.locator('.arrow-visible');
		await expect(arrowPath).toHaveCount(1);

		// Take screenshot with arrow
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-east-arrow.png');
	});

	test('can drag annotation on ordinal chart', async ({ page }) => {
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
			await page.mouse.move(initialBox.x - 100, initialBox.y + 80, { steps: 10 });
			await page.mouse.up();
		}

		// Get new position
		const newBox = await annotation.boundingBox();

		// Position should have changed
		expect(newBox?.x).not.toBe(initialBox?.x);

		// Take screenshot after drag
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-dragged-annotation.png');
	});

	test('ordinal chart arrows follow mouse without drift during drag', async ({ page }) => {
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
				{ x: startX + 30, y: startY + 20 },
				{ x: startX + 60, y: startY + 40 },
				{ x: startX + 90, y: startY + 60 }
			];

			for (let i = 0; i < steps.length; i++) {
				await page.mouse.move(steps[i].x, steps[i].y);
				await page.waitForTimeout(50);
				await expect(page.locator('.chart-container')).toHaveScreenshot(
					`ordinal-drag-step-${i}.png`
				);
			}

			await page.mouse.up();
		}
	});

	test('can toggle edit mode on ordinal chart', async ({ page }) => {
		// Uncheck the edit checkbox
		const checkbox = page.locator('input[type="checkbox"]');
		await checkbox.uncheck();

		// Annotation should still be visible in static mode
		const annotation = page.locator('.layercake-annotation');
		await expect(annotation).toBeVisible();

		// Take screenshot in static mode
		await expect(page.locator('.chart-container')).toHaveScreenshot('ordinal-static-mode.png');
	});
});

