import { test, expect } from '@playwright/test';

import { ANCHOR_PRESETS } from '../src/lib/modules/anchorPresets.js';

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

/** The annotation box, whichever mode drew it. */
const BOX = `${CHART} .draggable, ${CHART} .static-wrapper`;

test.beforeEach(async ({ page }) => {
	// No wait here: every test opens with setEditMode, which waits on the box it needs.
	await page.goto('/');
});

async function setEditMode(page, enabled) {
	const checkbox = page.locator('input[type="checkbox"]');
	if ((await checkbox.isChecked()) !== enabled) {
		await checkbox.click();
	}
	// Each mode draws its own box, so the box on the page says the switch landed.
	await expect(
		page.locator(enabled ? `${CHART} .draggable` : `${CHART} .static-wrapper`).first()
	).toBeAttached();
}

/**
 * Which preset the anchor sits on. The box carries the anchor as an inline
 * `translate: -x% -y%`, and leaves the property off while both are zero.
 */
async function anchorIndex(page) {
	const value = await page
		.locator(BOX)
		.first()
		.evaluate((el) => el.style.translate);
	// A browser may drop a trailing zero when it serializes the style, so a part
	// that isn't there is zero.
	const [x = 0, y = 0] = value ? value.split(/\s+/).map((part) => -parseFloat(part)) : [];
	return ANCHOR_PRESETS.findIndex((preset) => preset.x === x && preset.y === y);
}

/**
 * Option+click the annotation to move the anchor forward by `steps` presets,
 * counting from wherever it is now. Each step waits for the box's inline style
 * to show it landed.
 */
async function stepAnchor(page, steps) {
	const draggable = page.locator(`${CHART} .draggable`).first();
	for (let i = 0; i < steps; i++) {
		const next = ((await anchorIndex(page)) + 1) % ANCHOR_PRESETS.length;
		await draggable.click({ modifiers: ['Alt'], force: true });
		await expect.poll(() => anchorIndex(page)).toBe(next);
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
	return page.locator(BOX).first().boundingBox();
}

test('drawn arrow starts where its source handle sits, at a non-zero anchor', async ({ page }) => {
	await setEditMode(page, true);

	// Four steps from the top-left default is bottom-right, so anchorY is 100 and
	// the anchor term can't cancel.
	await stepAnchor(page, 4);

	const chart = page.locator(CHART);
	await chart.locator('.draggable').first().hover({ force: true });

	const handle = chart.locator('.arrow-zone.source').first();
	// The handle is always in the DOM and hovering the annotation is what shows it,
	// so the visible class is the signal that the hover landed.
	await expect(handle).toHaveClass(/visible/);
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
	await stepAnchor(page, 4);
	await setEditMode(page, false);
	// The static box carries the same anchor, so its style says the swap is done.
	await expect.poll(() => anchorIndex(page)).toBe(4);

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

	// Four steps is bottom-right: the anchor moves a full box width and height.
	await stepAnchor(page, 4);

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
		await stepAnchor(page, 1);

		const box = await boxRect(page);
		const start = await pathStart(arrow);
		const inside = start.y >= box.y - 2 && start.y <= box.y + box.height + 2;
		if (!inside) {
			const { x, y } = ANCHOR_PRESETS[i];
			offenders.push(
				`anchor ${x}/${y}: arrow starts at y=${start.y.toFixed(1)}, box is ${box.y.toFixed(1)}..${(box.y + box.height).toFixed(1)}`
			);
		}
	}

	expect(offenders).toEqual([]);
});

test('an annotation can be dragged to chart x 0', async ({ page }) => {
	await setEditMode(page, true);

	const chart = page.locator(CHART);
	const box = chart.locator('.draggable').first();

	// k.pointer() reports 0 at the left edge of the Html layer: that is where the
	// chart area starts, inside the padding. Reading it off the page keeps this
	// independent of whatever padding the demo happens to use.
	const origin = await chart.locator('.layercake-layout-html').first().boundingBox();

	await box.hover({ force: true });
	const grabber = chart.locator('.grabber.west').first();
	await expect(grabber).toBeVisible();
	const grab = await grabber.boundingBox();
	const y = grab.y + grab.height / 2;

	await page.mouse.move(grab.x + grab.width / 2, y);
	await page.mouse.down();

	// Stop at 1px on the way. Zero is the only position a truthiness check drops,
	// so a broken guard parks the box here and the last move does nothing.
	await page.mouse.move(origin.x + 1, y);
	await expect.poll(() => box.evaluate((el) => el.style.left)).toBe('1px');

	await page.mouse.move(origin.x, y);
	await page.mouse.up();

	await expect.poll(() => box.evaluate((el) => el.style.left)).toBe('0px');
});

test('dragging the annotation body moves it by the distance dragged', async ({ page }) => {
	await setEditMode(page, true);

	const box = page.locator(`${CHART} .draggable`).first();
	const before = await box.boundingBox();

	const dx = 60;
	const dy = 25;
	await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
	await page.mouse.down();
	// Several steps, because one drag mechanism sums per-event deltas and another
	// reads an absolute pointer: both have to land in the same place.
	for (const step of [0.3, 0.7, 1]) {
		await page.mouse.move(
			before.x + before.width / 2 + dx * step,
			before.y + before.height / 2 + dy * step
		);
	}
	await page.mouse.up();

	await expect.poll(async () => Math.round((await box.boundingBox()).x - before.x)).toBe(dx);
	expect(Math.abs((await box.boundingBox()).y - before.y - dy)).toBeLessThan(2);
});

test('resizing from the west edge keeps the arrows and the data point', async ({ page }) => {
	await setEditMode(page, true);

	const chart = page.locator(CHART);
	const box = chart.locator('.draggable').first();
	const arrow = chart.locator('path.arrow-visible').first();
	await expect(arrow).toBeAttached();

	await box.hover({ force: true });
	const grabber = chart.locator('.grabber.west').first();
	await expect(grabber).toBeVisible();
	const g = await grabber.boundingBox();
	const y = g.y + g.height / 2;

	await page.mouse.move(g.x + g.width / 2, y);
	await page.mouse.down();
	await page.mouse.move(g.x - 60, y);
	await page.mouse.up();

	// A resize reports only x. If the y data value gets dropped on the way through,
	// the scale returns NaN and every path built from it silently stops rendering.
	await expect(arrow).toBeAttached();
	expect(await arrow.getAttribute('d')).not.toContain('NaN');
	expect((await box.boundingBox()).height).toBeGreaterThan(0);
});
