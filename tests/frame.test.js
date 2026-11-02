import { test, expect } from '@playwright/test';

import { openFixture, chartAnnotations, configLogs, drag } from './helpers.js';

/**
 * What the frame around the editor does.
 *
 * `AnnotationsEditor` outlines the chart's plotting area. A tab in the frame's
 * corner holds the Editable switch and a Copy button. Copy puts the config on
 * the clipboard as JavaScript text, the same text `onsave` is handed. Where the
 * page has no clipboard, the text goes to the console instead. The button's
 * label says which happened, for as long as the copy still matches the chart.
 *
 * These run on the save fixture, src/routes/fixtures/save, with `ui=frame`. The
 * chart has one note in the middle and nowhere to save to, so Copy is the only
 * way the config leaves the page.
 */

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/**
 * The Copy button. It is found inside the tab, because the layer that adds
 * notes is a button too.
 */
function copyButton(page) {
	return page.locator('.layercake-annotations-tab').getByRole('button');
}

/** What the clipboard holds. */
function clipboardText(page) {
	return page.evaluate(() => navigator.clipboard.readText());
}

/** Run the copied text as JavaScript, the way a chart it is pasted into would. */
function run(text) {
	return new Function(`return ${text}`)();
}

test('on a time scale the copied text holds new Date("…") and runs back to the chart, and the click adds no note', async ({
	page
}) => {
	await openFixture(page, 'ui=frame&scale=time');
	const notes = page.locator('.draggable');
	await expect(notes).toHaveCount(1);

	const copy = copyButton(page);
	await copy.click();
	await expect(copy).toHaveText('Copied');

	const text = await clipboardText(page);
	expect(text).toMatch(/"date": new Date\("\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\)/);

	// Run as JavaScript, the text gives back what the chart holds, the moment included.
	const copied = run(text);
	const held = await chartAnnotations(page);
	expect(copied[0].data.date).toBeInstanceOf(Date);
	expect(copied[0].data.date.getTime()).toBe(held[0].data.date.getTime());
	expect(copied).toEqual(held);

	// The tab sits over the layer that adds notes, and the click was the button's alone.
	await expect(notes).toHaveCount(1);
});

test('"Copied" goes back to "Copy" after an edit, and a second Copy holds the new position', async ({
	page
}) => {
	const box = await openFixture(page, 'ui=frame');
	const copy = copyButton(page);

	await copy.click();
	await expect(copy).toHaveText('Copied');
	const first = run(await clipboardText(page));

	// The clipboard no longer matches the chart, so the label stops saying it does.
	await drag(page, box, 60, 30);
	await expect(copy).toHaveText('Copy');

	await copy.click();
	await expect(copy).toHaveText('Copied');
	const second = run(await clipboardText(page));

	expect(second).toEqual(await chartAnnotations(page));
	expect(second[0].data).not.toEqual(first[0].data);
});

test('with no clipboard, Copy logs the config once and says to look in the console', async ({
	page
}) => {
	// What a page that isn't a secure context has, like a dev server opened on a LAN address.
	await page.addInitScript(() => {
		delete (/** @type {any} */ (Navigator.prototype).clipboard);
	});

	const logged = configLogs(page);

	await openFixture(page, 'ui=frame');
	const copy = copyButton(page);

	await copy.click();
	await expect(copy).toHaveText('See console');
	await expect(copy).toHaveAttribute('title', /console/);

	// The config went to the console before the label changed, so it is all here by now.
	expect(logged).toEqual([expect.stringContaining('"text": "A note"')]);
});

test('Copy during an open text edit copies the text as typed', async ({ page }) => {
	await openFixture(page, 'ui=frame');
	const text = page.locator('.layercake-annotation').first();

	await text.dblclick({ force: true });
	await expect(page.locator('.textarea')).toBeFocused();
	await page.keyboard.type('Typed in');

	// Safari and Firefox on macOS give a clicked button no focus, so no blur ends
	// the edit before the click does. A click sent straight to the button is the same.
	const copy = copyButton(page);
	await copy.dispatchEvent('click');
	await expect(copy).toHaveText('Copied');

	expect(await clipboardText(page)).toContain('"text": "Typed in"');
});

test("the frame's editable class follows the switch, and the tab shows in both modes", async ({
	page
}) => {
	await openFixture(page, 'ui=frame');
	const frame = page.locator('.layercake-annotations-frame');
	const tab = page.locator('.layercake-annotations-tab');
	const toggle = page.getByRole('checkbox');

	await expect(toggle).toBeChecked();
	await expect(frame).toContainClass('editable');
	await expect(tab).toBeVisible();

	await toggle.click();
	await expect(page.locator('.static-wrapper')).toBeAttached();
	await expect(frame).toHaveCount(1);
	await expect(frame).not.toContainClass('editable');
	await expect(tab).toBeVisible();

	// The switch is still in reach, and turns editing back on.
	await toggle.click();
	await expect(page.locator('.draggable')).toBeAttached();
	await expect(frame).toContainClass('editable');
	await expect(tab).toBeVisible();
});
