import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

import { drag, positionOf } from './helpers.js';

/**
 * Saving into a file in the project, with `saveTo` and the Vite plugin in this
 * repo's vite.config.js. The fixture, src/routes/fixtures/file, starts its one
 * note from notes.annotations.js beside it and writes edits back there.
 */

const file = 'src/routes/fixtures/file/notes.annotations.js';

/** @type {string} */
let original;

test.beforeEach(async () => {
	original = await readFile(file, 'utf8');
});

test.afterEach(async () => {
	await writeFile(file, original);
});

test('an edit is written to the file without reloading the page, and a reload shows it', async ({
	page
}) => {
	await page.goto('/fixtures/file');
	const box = page.locator('.draggable').first();
	await expect(box).toBeAttached();

	// A hot update would build the chart again, which closes a note being typed
	// in. A new chart is new elements, and so is a reload, so neither keeps this mark.
	await box.evaluate((el) => el.setAttribute('data-same-element', ''));

	await drag(page, box, 60, 30);
	const moved = await positionOf(box);

	// The editor saves a second after the drag, so check often from then on.
	await expect
		.poll(() => readFile(file, 'utf8'), { intervals: [100], timeout: 5000 })
		.not.toBe(original);
	const contents = await readFile(file, 'utf8');
	expect(contents).toMatch(/^export default \[\n/);
	expect(contents).not.toContain('"x": 5,');

	// Long enough for a hot update from the write to have arrived, had one been sent.
	await page.waitForTimeout(500);
	await expect(box).toHaveAttribute('data-same-element');
	expect(await positionOf(box)).toEqual(moved);

	await page.reload();
	await expect(box).not.toHaveAttribute('data-same-element');
	await expect.poll(() => positionOf(box)).toEqual(moved);
});
