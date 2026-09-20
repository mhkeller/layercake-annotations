import { test, expect } from '@playwright/test';

/**
 * Who is told about a save, what they are handed, and when.
 *
 * The editor saves to one place, a second after the last edit. The `onsave` prop
 * is handed the config as JavaScript text, then a plain copy of the annotations.
 * Or else a function in context under `saveAnnotationConfig` is handed the copy
 * alone. Or else the text is logged to the console.
 *
 * These run on a page of their own, src/routes/fixtures/save, which mounts a
 * chart the way a host app would and takes its case from the query string. The
 * chart has one note in the middle. Each save function writes a record of its
 * call into `window.__saves` from inside the call, where the real arguments are.
 */

/** Open the fixture on one case, once its note is on the page. */
async function openFixture(page, query) {
	await page.goto(`/fixtures/save?${query}`);
	const box = page.locator('.draggable').first();
	await expect(box).toBeAttached();
	return box;
}

/** Every record the page's save functions have made so far. */
function saves(page) {
	return page.evaluate(() => /** @type {any} */ (window).__saves);
}

/** What the chart holds right now, as a plain copy. */
function chartAnnotations(page) {
	return page.evaluate(() => /** @type {any} */ (window).__chart.annotations());
}

/** Milliseconds since the page opened, on the clock the records use. */
function pageClock(page) {
	return page.evaluate(() => performance.now());
}

/** Every line the editor's own logger has printed. */
function configLogs(page) {
	/** @type {string[]} */
	const lines = [];
	page.on('console', (message) => {
		if (message.text().includes('Annotations config:')) lines.push(message.text());
	});
	return lines;
}

/** Drag a note by its middle. Every move of the drag is an edit. */
async function drag(page, box, dx, dy) {
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

test('onsave is called once, about a second after a drag, with the text and then a plain copy', async ({
	page
}) => {
	const box = await openFixture(page, 'hook=onsave');

	const pressed = await pageClock(page);
	await drag(page, box, 60, 30);
	const released = await pageClock(page);

	await expect.poll(() => saves(page)).toHaveLength(1);
	const [save] = await saves(page);

	expect(save.who).toBe('onsave');
	expect(save.kinds).toEqual(['string', 'array']);

	// The last edit came after the press and before the release. A save one
	// second after it is at least a second from the press, and about a second
	// from the release.
	expect(save.at - pressed).toBeGreaterThanOrEqual(1000);
	expect(save.at - released).toBeLessThan(1500);

	// Svelte keeps live state behind a Proxy, and structuredClone throws on a
	// Proxy. So a copy that clones is a plain one. The chart's own live state
	// does not clone, which shows the check can tell the two apart.
	expect(save.clones).toBe(true);
	expect(await page.evaluate(() => /** @type {any} */ (window).__chart.liveStateClones())).toBe(
		false
	);

	// The text is the annotations, and both are where the drag left the note.
	expect(save.textRunsToAnnotations).toBe(true);
	expect(save.annotations).toEqual(await chartAnnotations(page));

	// Still the one call, now that the checks above have taken their time.
	expect(await saves(page)).toHaveLength(1);
});

test('with no onsave, a function in context under saveAnnotationConfig is handed the annotations alone', async ({
	page
}) => {
	const box = await openFixture(page, 'hook=context');

	await drag(page, box, 60, 30);

	await expect.poll(() => saves(page)).toHaveLength(1);
	const [save] = await saves(page);

	expect(save.who).toBe('context');

	// What the context function is handed, in order: the annotations and nothing
	// else. This is the one line to edit if that changes.
	expect(save.kinds).toEqual(['array']);

	expect(save.clones).toBe(true);
	expect(save.annotations).toEqual(await chartAnnotations(page));
});

test('with both, only onsave is called and nothing is logged', async ({ page }) => {
	const logs = configLogs(page);
	const box = await openFixture(page, 'hook=both');

	await drag(page, box, 60, 30);

	// One save calls one function. Anything else it called in the same turn would
	// be on the list by the time onsave is.
	await expect.poll(() => saves(page)).toHaveLength(1);
	expect((await saves(page))[0].who).toBe('onsave');
	expect(logs).toEqual([]);
});

test('with neither, the text is logged to the console', async ({ page }) => {
	const logs = configLogs(page);
	const box = await openFixture(page, 'hook=none');

	await drag(page, box, 60, 30);

	await expect.poll(() => logs).toHaveLength(1);
	expect(logs[0]).toContain('"text": "A note"');
});

test('on a time scale the text holds new Date("…") and the annotations hold a real Date', async ({
	page
}) => {
	const box = await openFixture(page, 'hook=onsave&scale=time');

	await drag(page, box, 60, 30);

	await expect.poll(() => saves(page)).toHaveLength(1);
	const [save] = await saves(page);

	expect(save.text).toMatch(/"date": new Date\("\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\)/);
	expect(save.dateIsDate).toBe(true);

	// Run as JavaScript, the text gives the same moment back.
	expect(save.textRunsToAnnotations).toBe(true);

	// The drag moved the note along the time axis, so the date is one the editor made.
	expect(save.clones).toBe(true);
	expect(save.annotations[0].data.date).not.toEqual(new Date('2024-03-15T00:00:00.000Z'));
});

test('switching edit mode off straight after an edit saves at once, and only once', async ({
	page
}) => {
	const box = await openFixture(page, 'hook=onsave');

	const pressed = await pageClock(page);
	await drag(page, box, 60, 30);
	await page.getByRole('checkbox').click();
	await expect(page.locator('.static-wrapper')).toBeAttached();

	await expect.poll(() => saves(page)).toHaveLength(1);
	const [save] = await saves(page);

	// A save left to the clock comes a second or more after the press. This one
	// came sooner, so it is the switch that sent it.
	expect(save.at - pressed).toBeLessThan(1000);
	expect(save.annotations).toEqual(await chartAnnotations(page));

	// Long enough for the save that was waiting to have fired, had it been left
	// waiting.
	await page.waitForTimeout(1300);
	expect(await saves(page)).toHaveLength(1);
});

test('several edits in quick succession give one save, with the last position', async ({
	page
}) => {
	const box = await openFixture(page, 'hook=onsave');

	const pressed = await pageClock(page);
	await drag(page, box, 30, 10);
	const afterFirst = await chartAnnotations(page);
	await drag(page, box, 30, 10);
	const lastPressed = await pageClock(page);
	await drag(page, box, 30, 10);
	const released = await pageClock(page);

	// Each drag started within a second of the one before.
	expect(released - pressed).toBeLessThan(1000);

	await expect.poll(() => saves(page)).toHaveLength(1);

	// Had each edit kept a save of its own, the rest would follow the first by as
	// long as the drags took. Give them that long to show up.
	await page.waitForTimeout(released - pressed + 200);

	const all = await saves(page);
	expect(all).toHaveLength(1);
	expect(all[0].annotations).toEqual(await chartAnnotations(page));
	expect(all[0].annotations).not.toEqual(afterFirst);

	// Each edit starts the second again, so the save is a second or more after the last press.
	expect(all[0].at - lastPressed).toBeGreaterThanOrEqual(1000);
});
