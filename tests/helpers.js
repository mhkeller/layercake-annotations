import { expect } from '@playwright/test';

/**
 * Helpers shared by the Playwright tests. The first two drive the save fixture,
 * src/routes/fixtures/save, which mounts one chart with one note in the middle.
 */

/** Open the save fixture on one case, once its note is on the page. */
export async function openFixture(page, query) {
	await page.goto(`/fixtures/save?${query}`);
	const box = page.locator('.draggable').first();
	await expect(box).toBeAttached();
	return box;
}

/** What the fixture's chart holds right now, as a plain copy. */
export function chartAnnotations(page) {
	return page.evaluate(() => /** @type {any} */ (window).__chart.annotations());
}

/**
 * Every console.log on the page. Nothing on the test pages logs, so any line here
 * is the config, whatever form it was logged in. Matching on its text would miss
 * a config logged as an object, which the console shows as `[Object]`.
 */
export function configLogs(page) {
	/** @type {string[]} */
	const lines = [];
	page.on('console', (message) => {
		if (message.type() === 'log') lines.push(message.text());
	});
	return lines;
}

/**
 * Where a note's anchor sits, as percentages of its box. The box carries the
 * anchor as an inline `translate: -x% -y%`, and leaves the property off while
 * both are zero. A browser may drop a trailing zero when it serializes the
 * style, so a part that isn't there is zero. `|| 0` turns the -0 that negating
 * `0%` gives into 0, which `toEqual` would otherwise tell apart.
 */
export async function anchorOf(box) {
	const value = await box.evaluate((el) => el.style.translate);
	const [x = 0, y = 0] = value ? value.split(/\s+/).map((part) => -parseFloat(part) || 0) : [];
	return { x, y };
}

/**
 * Move a note's anchor to `x`, `y` with the diamond's arrow keys. Each press moves
 * it 5 points, so both have to be multiples of 5.
 */
export async function moveAnchor(page, box, x, y) {
	await box.hover({ force: true });
	const diamond = box.locator('.anchor-indicator');
	await diamond.focus();

	const from = await anchorOf(box);
	const presses = [
		...Array(Math.abs(x - from.x) / 5).fill(x > from.x ? 'ArrowRight' : 'ArrowLeft'),
		...Array(Math.abs(y - from.y) / 5).fill(y > from.y ? 'ArrowDown' : 'ArrowUp')
	];
	for (const key of presses) await page.keyboard.press(key);

	await expect.poll(() => anchorOf(box)).toEqual({ x, y });
}

/** Drag a note by its middle. Every move of the drag is an edit. */
export async function drag(page, box, dx, dy) {
	const b = await box.boundingBox();
	const start = { x: b.x + b.width / 2, y: b.y + b.height / 2 };

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	for (const step of [0.3, 0.7, 1]) {
		await page.mouse.move(start.x + dx * step, start.y + dy * step);
	}
	await page.mouse.up();

	await expect.poll(async () => Math.round((await box.boundingBox()).x - b.x)).toBe(dx);
}

/** Where a note is, not its size: the frame's font can still be loading, which changes the height. */
export async function positionOf(box) {
	const { x, y } = await box.boundingBox();
	return { x, y };
}
