import { test, expect } from '@playwright/test';

import { drag, positionOf } from './helpers.js';

/**
 * `Annotations` on the dev server, where the tests run: the framed editor, or
 * the static notes when `hideTools` is set. What a production build does is
 * left to the bundler, so it isn't tested here.
 *
 * The fixture, src/routes/fixtures/switch, has one note and a checkbox for `hideTools`.
 */

test('on the dev server it is the framed editor', async ({ page }) => {
	await page.goto('/fixtures/switch');

	await expect(page.locator('.layercake-annotations-frame')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
	await expect(page.locator('.draggable')).toHaveCount(1);
	await expect(page.locator('.static-wrapper')).toHaveCount(0);
});

test('hideTools shows the static notes, and turning it off brings the editor back with the edits', async ({
	page
}) => {
	await page.goto('/fixtures/switch');
	const box = page.locator('.draggable').first();
	await expect(box).toBeAttached();

	await drag(page, box, 60, 30);
	const moved = await positionOf(box);

	await page.getByLabel('Hide tools').check();
	await expect(page.locator('.static-wrapper')).toBeAttached();
	await expect(page.locator('.layercake-annotations-frame')).toHaveCount(0);
	await expect(page.locator('.draggable')).toHaveCount(0);

	await page.getByLabel('Hide tools').uncheck();
	await expect(page.locator('.layercake-annotations-frame')).toBeVisible();
	await expect(page.locator('.static-wrapper')).toHaveCount(0);
	await expect.poll(() => positionOf(box)).toEqual(moved);
});
