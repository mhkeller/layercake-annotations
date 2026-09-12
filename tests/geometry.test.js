import { test, expect } from '@playwright/test';

/**
 * Numeric geometry checks.
 *
 * The screenshot suite cannot catch arrow misplacement: every scenario it covers
 * sits at anchorY 0, where the anchor term drops out and wrong maths still looks
 * right. These assert coordinates directly, at a non-zero anchor.
 *
 * The invariant under test: an arrow is drawn where its handle says it is, and
 * moving the anchor doesn't drag the arrow off the annotation.
 */

const CHART = '.chart-container.line';

/** Option+click cycles the anchor through nine presets, clockwise from top-left. */
const ANCHOR_PRESETS = [
	{ x: 0, y: 0 },
	{ x: 50, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 50 },
	{ x: 100, y: 100 },
	{ x: 50, y: 100 },
	{ x: 0, y: 100 },
	{ x: 0, y: 50 },
	{ x: 50, y: 50 }
];

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');
});

async function setEditMode(page, enabled) {
	const checkbox = page.locator('input[type="checkbox"]');
	if ((await checkbox.isChecked()) !== enabled) {
		await checkbox.click();
		await page.waitForTimeout(300);
	}
}

/** Step the anchor to a preset by index, using Option+click on the annotation. */
async function cycleAnchorTo(page, index) {
	const draggable = page.locator(`${CHART} .draggable`).first();
	for (let i = 0; i < index; i++) {
		await draggable.click({ modifiers: ['Alt'], force: true });
		await page.waitForTimeout(120);
	}
}

/** Where an SVG path begins, in viewport pixels. */
async function pathStart(locator) {
	return locator.evaluate((el) => {
		const p = el.getPointAtLength(0);
		const m = el.getScreenCTM();
		return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
	});
}

/** Middle of an element, in viewport pixels. */
async function centre(locator) {
	const b = await locator.boundingBox();
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function boxRect(page) {
	const el = page.locator(`${CHART} .draggable, ${CHART} .static-wrapper`).first();
	return el.boundingBox();
}

test('drawn arrow starts where its source handle sits, at a non-zero anchor', async ({ page }) => {
	await setEditMode(page, true);

	// Preset 4 is bottom-right, so anchorY is 100 and the anchor term can't cancel.
	await cycleAnchorTo(page, 4);

	const chart = page.locator(CHART);
	await chart.locator('.draggable').first().hover({ force: true });
	await page.waitForTimeout(150);

	const handle = chart.locator('.arrow-zone.source').first();
	await expect(handle).toBeVisible();

	const arrow = chart.locator('path.arrow-visible').first();
	await expect(arrow).toBeAttached();

	const start = await pathStart(arrow);
	const grip = await centre(handle);

	expect(Math.abs(start.x - grip.x)).toBeLessThan(2);
	expect(Math.abs(start.y - grip.y)).toBeLessThan(2);
});

test('arrow stays attached to the annotation in static mode, at a non-zero anchor', async ({
	page
}) => {
	await setEditMode(page, true);
	await cycleAnchorTo(page, 4);
	await setEditMode(page, false);
	await page.waitForTimeout(200);

	const box = await boxRect(page);
	const arrow = page.locator(`${CHART} path.arrow-visible`).first();
	const start = await pathStart(arrow);

	// The arrow has to leave from somewhere on the annotation, not from open space
	// above or below it. A couple of pixels of slack for the border.
	expect(start.y).toBeGreaterThanOrEqual(box.y - 2);
	expect(start.y).toBeLessThanOrEqual(box.y + box.height + 2);
});

test('moving the anchor leaves an attached arrow where it was', async ({ page }) => {
	await setEditMode(page, true);

	const chart = page.locator(CHART);
	const arrow = chart.locator('path.arrow-visible').first();
	await expect(arrow).toBeAttached();

	const before = await pathStart(arrow);

	// Bottom-right: the anchor moves a full box width and height.
	await cycleAnchorTo(page, 4);
	await page.waitForTimeout(200);

	const after = await pathStart(arrow);

	expect(Math.abs(after.x - before.x)).toBeLessThan(2);
	expect(Math.abs(after.y - before.y)).toBeLessThan(2);
});

test('every anchor preset keeps the arrow on the annotation', async ({ page }) => {
	await setEditMode(page, true);

	const chart = page.locator(CHART);
	const arrow = chart.locator('path.arrow-visible').first();
	const offenders = [];

	for (let i = 1; i < ANCHOR_PRESETS.length; i++) {
		await cycleAnchorTo(page, 1);
		await page.waitForTimeout(120);

		const box = await boxRect(page);
		const start = await pathStart(arrow);
		const inside = start.y >= box.y - 2 && start.y <= box.y + box.height + 2;
		if (!inside) {
			const { x, y } = ANCHOR_PRESETS[i];
			offenders.push(`anchor ${x}/${y}: arrow starts at y=${start.y.toFixed(1)}, box is ${box.y.toFixed(1)}..${(box.y + box.height).toFixed(1)}`);
		}
	}

	expect(offenders).toEqual([]);
});
