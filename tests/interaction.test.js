import { test, expect } from '@playwright/test';

import { ANCHOR_PRESETS } from '../src/lib/modules/anchorPresets.js';

/**
 * What the editor does with presses, keys and drags.
 *
 * A screenshot shows one moment. These are about sequences: a key pressed while
 * the mouse rests somewhere, an edit that ends with a press somewhere else, a
 * drag that ends in a way other than a release. Each one asserts what is on the
 * chart afterwards.
 *
 * Both charts start out editable. The line chart has one note with an arrow on
 * its east side. The column chart has two notes, ids 0 and 1, on a band x scale.
 */

const LINE = '.chart-container.line';
const COLUMN = '.chart-container.ordinal';

test.beforeEach(async ({ page }) => {
	// No wait here: every test opens with editableChart, which waits on the notes it needs.
	await page.goto('/');
});

/**
 * One of the demo's charts, once its notes are on the page. Layer Cake draws
 * nothing until it has measured itself.
 */
async function editableChart(page, selector) {
	const chart = page.locator(selector);
	await expect(chart.locator('.draggable').first()).toBeAttached();
	return chart;
}

/** A note's box, found by the note's id. The id stays the same while the text changes. */
function note(chart, id) {
	return chart.locator(`.draggable:has([data-id="${id}"])`);
}

/** Middle of an element, in viewport pixels. */
async function centre(locator) {
	const b = await locator.boundingBox();
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/**
 * A point in the chart area with nothing over it, in viewport pixels: a press
 * there lands on the layer that adds notes.
 */
async function emptySpot(page, chart) {
	const area = await chart.locator('.note-listener').boundingBox();
	const spot = { x: area.x + area.width * 0.12, y: area.y + area.height * 0.8 };

	// If the demo's notes move, this says so, rather than a test clicking on a note.
	const hit = await page.evaluate(
		({ x, y }) => document.elementFromPoint(x, y)?.className ?? '',
		spot
	);
	expect(hit).toContain('note-listener');

	return spot;
}

/** Press on a point, move there first. */
async function pressAt(page, point) {
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
}

/** What an element's text really is, line breaks and spaces included. */
async function rawText(locator) {
	return locator.evaluate((el) => el.textContent);
}

/** Every arrow path's `d` in a chart. */
async function arrowPaths(chart) {
	return chart
		.locator('path.arrow-visible')
		.evaluateAll((paths) => paths.map((p) => p.getAttribute('d')));
}

/**
 * Which preset the anchor sits on. The box carries the anchor as an inline
 * `translate: -x% -y%`, and leaves the property off while both are zero.
 */
async function anchorIndex(box) {
	const value = await box.evaluate((el) => el.style.translate);
	const [x = 0, y = 0] = value ? value.split(/\s+/).map((part) => -parseFloat(part)) : [];
	return ANCHOR_PRESETS.findIndex((preset) => preset.x === x && preset.y === y);
}

/** Option+click the note to move its anchor forward by `steps` presets. */
async function stepAnchor(box, steps) {
	for (let i = 0; i < steps; i++) {
		const next = ((await anchorIndex(box)) + 1) % ANCHOR_PRESETS.length;
		await box.click({ modifiers: ['Alt'], force: true });
		await expect.poll(() => anchorIndex(box)).toBe(next);
	}
}

test('starting to edit a second note straight after the first keeps Backspace in the text', async ({
	page
}) => {
	const chart = await editableChart(page, COLUMN);
	const a = note(chart, 0);
	const b = note(chart, 1);

	await a.locator('.layercake-annotation').dblclick({ force: true });
	await expect(a.locator('.textarea')).toBeFocused();

	// Straight over to the other note. The first edit ends on the way.
	await b.locator('.layercake-annotation').dblclick({ force: true });

	// Long enough for anything the first edit left running to have fired.
	await page.waitForTimeout(400);

	// The mouse rests on the second note, which is what a Backspace outside the
	// text would delete. The text is all selected, so inside the text it empties it.
	await page.keyboard.press('Backspace');

	await expect(chart.locator('.draggable')).toHaveCount(2);
	await expect(b.locator('.textarea')).toBeFocused();
	await expect.poll(async () => (await rawText(b.locator('.textarea'))).trim()).toBe('');

	await page.keyboard.type('Second');
	await page.keyboard.press('Enter');

	await expect(b.locator('pre')).toHaveText('Second');
	await expect(a.locator('pre')).toHaveText('A counter-clockwise arrow');
	await expect(chart.locator('.draggable')).toHaveCount(2);
});

test('ending an edit with a slow click on empty chart space adds no note', async ({ page }) => {
	const chart = await editableChart(page, LINE);

	await chart.locator('.layercake-annotation').first().dblclick({ force: true });
	await expect(chart.locator('.textarea')).toBeFocused();

	const spot = await emptySpot(page, chart);
	await pressAt(page, spot);
	await page.waitForTimeout(300);
	await page.mouse.up();

	// The click ended the edit and that was all it was for.
	await expect(chart.locator('.textarea')).toHaveCount(0);
	await expect(chart.locator('.draggable')).toHaveCount(1);

	// The next click is an ordinary one. It adds one note, which also says the
	// first click added none: a late one would make three.
	await page.mouse.click(spot.x, spot.y);
	await expect(chart.locator('.draggable')).toHaveCount(2);
});

test('Backspace typed into an input elsewhere on the page leaves a hovered note alone', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();

	// Fixed in the corner, so adding it moves nothing else on the page. Focused
	// from script, so the mouse is free to rest on the note.
	await page.evaluate(() => {
		const input = document.createElement('input');
		input.id = 'elsewhere';
		input.style.cssText = 'position: fixed; top: 0; left: 0;';
		document.body.append(input);
		input.focus();
	});

	await box.hover({ force: true });
	await expect(box).toHaveClass(/hovering/);

	await page.keyboard.type('ab');
	await page.keyboard.press('Backspace');

	await expect(page.locator('#elsewhere')).toHaveValue('a');
	await expect(box).toBeAttached();

	// The same key with nothing being typed into does delete the note, so the
	// hover was live all along.
	await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement).blur());
	await page.keyboard.press('Backspace');
	await expect(chart.locator('.draggable')).toHaveCount(0);
});

test('deleting a note in the middle of a press leaves hovering working on the other note', async ({
	page
}) => {
	const chart = await editableChart(page, COLUMN);
	const a = note(chart, 0);
	const b = note(chart, 1);

	await pressAt(page, await centre(a));
	await page.keyboard.press('Backspace');
	await expect(a).toHaveCount(0);

	// The button is still down. The press went with the note, so nothing is left to wait for a release.
	await b.hover({ force: true });
	await expect(b).toHaveClass(/hovering/);
	await page.mouse.up();
});

test('a note whose text opens for editing in the middle of a press stays where it is', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();
	const before = await box.boundingBox();

	// The press focuses the text, and Enter opens it with the button still down.
	const text = await centre(chart.locator('.text-display pre').first());
	await pressAt(page, text);
	await page.keyboard.press('Enter');
	await expect(chart.locator('.textarea')).toHaveCount(1);

	await page.mouse.move(text.x + 20, text.y + 10, { steps: 4 });
	await page.mouse.up();

	const after = await box.boundingBox();
	expect(Math.round(after.x - before.x)).toBe(0);
	expect(Math.round(after.y - before.y)).toBe(0);
});

test('a right-button press and move leaves the note where it was', async ({ page }) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();
	const before = await box.boundingBox();
	const start = await centre(box);

	const dx = 60;
	const dy = 25;

	await page.mouse.move(start.x, start.y);
	await page.mouse.down({ button: 'right' });
	for (const step of [0.3, 0.7, 1]) {
		await page.mouse.move(start.x + dx * step, start.y + dy * step);
	}
	expect(await box.boundingBox()).toEqual(before);
	await page.mouse.up({ button: 'right' });
	expect(await box.boundingBox()).toEqual(before);

	// The same moves with the left button do drag it, measured from where it
	// started: the right button neither moved it nor left the editor stuck.
	await pressAt(page, start);
	for (const step of [0.3, 0.7, 1]) {
		await page.mouse.move(start.x + dx * step, start.y + dy * step);
	}
	await page.mouse.up();

	await expect.poll(async () => Math.round((await box.boundingBox()).x - before.x)).toBe(dx);
	expect(Math.abs((await box.boundingBox()).y - before.y - dy)).toBeLessThan(2);
});

test('a click on the handle that starts an arrow adds none, and dragging it outward adds one', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();
	const arrows = chart.locator('path.arrow-visible');
	await expect(arrows).toHaveCount(1);

	// The west side has no arrow, so it shows the handle that would start one.
	await box.hover({ force: true });
	const handle = chart.locator('.arrow-zone.create.west');
	await expect(handle).toHaveClass(/visible/);
	const grip = await centre(handle);

	await pressAt(page, grip);
	await page.mouse.up();

	await expect(handle).toBeAttached();
	await expect(arrows).toHaveCount(1);

	await pressAt(page, grip);
	await page.mouse.move(grip.x - 30, grip.y + 10);
	await page.mouse.move(grip.x - 60, grip.y + 20);
	await page.mouse.up();

	await expect(arrows).toHaveCount(2);
	await expect(chart.locator('.arrow-zone.source.west')).toBeAttached();
	for (const d of await arrowPaths(chart)) {
		expect(d).not.toContain('NaN');
	}
});

// Where the pointer is left once the arrow has gone depends on where its source
// handle sat. The line chart's sits over the note, so the pointer ends up resting
// on the note itself. The column chart's first note has it clear of the box, where
// the handle that starts a new arrow takes its place.
const sourceHandles = [
	{ where: 'over the note', selector: LINE, side: 'east', notes: 1, arrows: 1 },
	{ where: 'beside the note', selector: COLUMN, side: 'west', notes: 2, arrows: 2 }
];

// Two ways to send the key twice: two presses, and a second key-down with the first still held.
const secondPresses = [
	{ name: 'pressed twice', held: false },
	{ name: 'held down', held: true }
];

for (const { where, selector, side, notes, arrows } of sourceHandles) {
	for (const { name, held } of secondPresses) {
		test(`Backspace ${name} on a source handle ${where} removes the arrow and keeps the note`, async ({
			page
		}) => {
			const chart = await editableChart(page, selector);
			const box = chart.locator('.draggable').first();
			const paths = chart.locator('path.arrow-visible');
			await expect(paths).toHaveCount(arrows);

			// Hovering the note shows its handles. Then rest on the one where its arrow leaves.
			await box.hover({ force: true });
			const handle = chart.locator(`.arrow-zone.source.${side}`).first();
			await expect(handle).toHaveClass(/visible/);
			const grip = await centre(handle);
			await page.mouse.move(grip.x, grip.y);

			await page.keyboard.down('Backspace');
			if (!held) await page.keyboard.up('Backspace');
			await expect(paths).toHaveCount(arrows - 1);

			// The pointer hasn't moved. The browser still works out what it rests on
			// with the handle gone and reports an enter, a moment later. Give that
			// moment time to pass: nothing was pointed at, so nothing is hovered.
			await page.waitForTimeout(150);
			await expect(box).not.toHaveClass(/hovering/);

			// With the key still down, a second down is a key repeat.
			await page.keyboard.down('Backspace');
			await page.keyboard.up('Backspace');

			await expect(paths).toHaveCount(arrows - 1);
			await expect(chart.locator('.draggable')).toHaveCount(notes);
		});
	}
}

test('once the pointer moves, Backspace deletes the note whose arrow it deleted before', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();

	await box.hover({ force: true });
	const handle = chart.locator('.arrow-zone.source.east');
	await expect(handle).toHaveClass(/visible/);
	const grip = await centre(handle);
	await page.mouse.move(grip.x, grip.y);

	await page.keyboard.press('Backspace');
	await expect(chart.locator('path.arrow-visible')).toHaveCount(0);

	// This handle sat over the note, so the pointer rests on the note. The note
	// is hovered once the pointer says so with a move.
	await page.waitForTimeout(150);
	await expect(box).not.toHaveClass(/hovering/);
	await page.mouse.move(grip.x - 2, grip.y);
	await expect(box).toHaveClass(/hovering/);

	await page.keyboard.press('Backspace');
	await expect(chart.locator('.draggable')).toHaveCount(0);
});

test('from the keyboard, Delete takes a focused arrow and then the focused note', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();

	await chart.locator('.arrow-zone.source.east').focus();
	await page.keyboard.press('Delete');
	await expect(chart.locator('path.arrow-visible')).toHaveCount(0);
	await expect(box).toBeAttached();

	await box.focus();
	await page.keyboard.press('Delete');
	await expect(chart.locator('.draggable')).toHaveCount(0);
});

test('deleting a note that sits on another leaves the one underneath alone', async ({ page }) => {
	const chart = await editableChart(page, COLUMN);
	const notes = chart.locator('.draggable');
	const under = note(chart, 0);

	// Put note 1 on top of note 0 and leave the pointer where it is.
	const from = await centre(note(chart, 1));
	const to = await centre(under);
	await pressAt(page, from);
	await page.mouse.move(to.x, to.y, { steps: 5 });
	await page.mouse.up();
	await expect(note(chart, 1)).toHaveClass(/hovering/);

	await page.keyboard.press('Backspace');
	await expect(notes).toHaveCount(1);

	// The note underneath is uncovered, and it was never pointed at.
	await page.waitForTimeout(150);
	await expect(under).not.toHaveClass(/hovering/);
	await page.keyboard.press('Backspace');
	await expect(notes).toHaveCount(1);

	// A move onto it is what makes it the hovered one.
	await page.mouse.move(to.x - 2, to.y);
	await expect(under).toHaveClass(/hovering/);
	await page.keyboard.press('Backspace');
	await expect(notes).toHaveCount(0);
});

test('a held Backspace deletes one thing, however far the pointer travels', async ({ page }) => {
	const chart = await editableChart(page, COLUMN);
	const notes = chart.locator('.draggable');
	const b = note(chart, 1);

	await note(chart, 0).hover({ force: true });
	await page.keyboard.down('Backspace');
	await expect(notes).toHaveCount(1);

	// The key is still down, so this second down is a repeat, with the pointer on the other note.
	await b.hover({ force: true });
	await expect(b).toHaveClass(/hovering/);
	await page.keyboard.down('Backspace');
	await expect(notes).toHaveCount(1);
	await page.keyboard.up('Backspace');

	// A fresh press does delete it.
	await page.keyboard.press('Backspace');
	await expect(notes).toHaveCount(0);
});

test('a note dragged well past the left edge of a band chart still draws and drags back', async ({
	page
}) => {
	const chart = await editableChart(page, COLUMN);
	const a = note(chart, 0);

	// k.pointer() reports 0 at the left edge of the Html layer: that is where the
	// chart area, and the first band, starts.
	const origin = await chart.locator('.layercake-layout-html').first().boundingBox();
	const before = await a.boundingBox();
	const start = await centre(a);

	// This note hangs off its top-left corner, so its anchor ends up 80px left
	// of every band.
	const past = origin.x - 80 + before.width / 2;

	await pressAt(page, start);
	await page.mouse.move((start.x + past) / 2, start.y);
	await page.mouse.move(past, start.y);
	await page.mouse.up();

	const left = await a.evaluate((el) => el.style.left);
	expect(left).toMatch(/^-?\d+(\.\d+)?px$/);
	expect(parseFloat(left)).toBeCloseTo(-80, 0);

	const paths = await arrowPaths(chart);
	expect(paths).toHaveLength(2);
	for (const d of paths) {
		expect(d).not.toContain('NaN');
	}

	// And back again, by the distance dragged.
	const parked = await a.boundingBox();
	await pressAt(page, { x: past, y: start.y });
	await page.mouse.move(past + 100, start.y);
	await page.mouse.move(past + 200, start.y);
	await page.mouse.up();

	await expect.poll(async () => Math.round((await a.boundingBox()).x - parked.x)).toBe(200);
	for (const d of await arrowPaths(chart)) {
		expect(d).not.toContain('NaN');
	}
});

test("the platform's shortcut key plus a click cycles the text alignment", async ({ page }) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();
	const text = chart.locator('.layercake-annotation').first();
	await expect(text).toHaveCSS('text-align', 'left');

	// Cmd on macOS, Ctrl on Windows and Linux.
	await box.click({ modifiers: ['ControlOrMeta'], force: true });
	await expect(text).toHaveCSS('text-align', 'center');

	// Ctrl counts everywhere a Ctrl+click arrives as a click. macOS turns it into
	// a right click, so ask the page whether one came through.
	await page.evaluate(() => {
		window.addEventListener(
			'click',
			(e) => {
				if (e.ctrlKey) document.body.dataset.ctrlClick = 'true';
			},
			{ capture: true }
		);
	});
	await box.click({ modifiers: ['Control'], force: true });

	const delivered = await page.evaluate(() => document.body.dataset.ctrlClick === 'true');
	if (!delivered) {
		// Nothing came through, so nothing changed. Send the click the way it
		// arrives on Windows and Linux.
		await expect(text).toHaveCSS('text-align', 'center');
		await box.dispatchEvent('click', { ctrlKey: true });
	}
	await expect(text).toHaveCSS('text-align', 'right');
});

test('a note left blank gets the default text, and a single space is kept as typed', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const text = chart.locator('.layercake-annotation').first();
	const pre = text.locator('pre');

	await text.dblclick({ force: true });
	await expect(chart.locator('.textarea')).toBeFocused();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Backspace');
	await page.keyboard.press('Enter');

	await expect(pre).toHaveText('New note...');

	// A space is how a note with an arrow and no label is made.
	await text.dblclick({ force: true });
	await expect(chart.locator('.textarea')).toBeFocused();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.type(' ');
	await page.keyboard.press('Enter');

	await expect(chart.locator('.textarea')).toHaveCount(0);
	await expect.poll(() => rawText(pre)).toBe(' ');
	await expect(chart.locator('.draggable')).toHaveCount(1);
});

test('a double click on empty chart space adds exactly one note', async ({ page }) => {
	const chart = await editableChart(page, LINE);
	const notes = chart.locator('.draggable');
	await expect(notes).toHaveCount(1);

	const spot = await emptySpot(page, chart);
	await page.mouse.dblclick(spot.x, spot.y);

	await expect(notes).toHaveCount(2);
	await expect(chart.locator('.layercake-annotation').last()).toHaveText('New note...');
});

test('a double click on empty chart space that ends an edit adds no note', async ({ page }) => {
	const chart = await editableChart(page, LINE);
	const notes = chart.locator('.draggable');

	await chart.locator('.text-display').first().dblclick();
	await expect(chart.locator('.textarea')).toHaveCount(1);

	// The first click ends the edit. The second still reaches the layer that adds notes.
	const spot = await emptySpot(page, chart);
	await page.mouse.dblclick(spot.x, spot.y);

	await expect(chart.locator('.textarea')).toHaveCount(0);
	await expect(notes).toHaveCount(1);
});

test('Enter held down on the focused chart adds one note', async ({ page }) => {
	const chart = await editableChart(page, LINE);
	const notes = chart.locator('.draggable');
	await expect(notes).toHaveCount(1);

	await chart.locator('.note-listener').focus();
	await page.keyboard.down('Enter');
	await page.keyboard.down('Enter');
	await page.keyboard.down('Enter');
	await page.keyboard.up('Enter');

	await expect(notes).toHaveCount(2);
});

test('resizing with the arrow keys holds the left edge still, at a non-zero anchor', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const box = chart.locator('.draggable').first();

	// One step from the top-left default is top-center: the anchor sits halfway
	// along the box, so a wider box has to move its anchor to keep its left edge.
	await stepAnchor(box, 1);
	const before = await box.boundingBox();

	await chart.locator('.grabber.east').first().focus();
	await page.keyboard.press('ArrowRight');

	await expect
		.poll(async () => Math.round((await box.boundingBox()).width - before.width))
		.toBe(10);
	expect(Math.abs((await box.boundingBox()).x - before.x)).toBeLessThan(1);
});

test('Enter on a focused note opens its text as it was, and Escape leaves it unchanged', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const original = 'Annotation text';

	await chart.locator('.text-display').first().focus();
	await page.keyboard.press('Enter');

	const textarea = chart.locator('.textarea');
	await expect(textarea).toBeFocused();
	// The Enter that opened the box must not also land in it as a line break.
	expect(await textarea.evaluate((el) => el.innerText)).toBe(original);

	await page.keyboard.press('Escape');

	await expect(textarea).toHaveCount(0);
	expect(await rawText(chart.locator('.layercake-annotation pre').first())).toBe(original);
});

test('a published note lets a finger scroll the page, and a draggable note takes the touch', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	await expect(chart.locator('.draggable.canDrag').first()).toHaveCSS('touch-action', 'none');

	await chart.getByRole('checkbox').click();

	const published = chart.locator('.static-wrapper').first();
	await expect(published).toHaveCSS('touch-action', 'auto');
	await expect(published.locator('.layercake-annotation')).toHaveCSS('touch-action', 'auto');
});

test('editing text logs no Svelte ownership warning', async ({ page }) => {
	const messages = [];
	page.on('console', (message) => messages.push(message.text()));

	const chart = await editableChart(page, LINE);
	const text = chart.locator('.layercake-annotation').first();

	await text.dblclick({ force: true });
	await expect(chart.locator('.textarea')).toBeFocused();
	await page.keyboard.type('Typed over');
	await page.keyboard.press('Enter');

	await expect(text.locator('pre')).toHaveText('Typed over');
	expect(messages.filter((m) => m.includes('ownership_invalid_mutation'))).toEqual([]);
});

test('with no save hook, an edit is logged to the console as a config to paste back', async ({
	page
}) => {
	const chart = await editableChart(page, LINE);
	const text = chart.locator('.layercake-annotation').first();

	// The demo passes no `onsave`, so the config goes to the console, a moment
	// after the last change.
	const logged = page.waitForEvent('console', (message) => message.text().includes('Typed over'));

	await text.dblclick({ force: true });
	await expect(chart.locator('.textarea')).toBeFocused();
	await page.keyboard.type('Typed over');
	await page.keyboard.press('Enter');

	const message = (await logged).text();
	const config = JSON.parse(message.slice(message.indexOf('[')));

	// The whole config, with the edit in it and the rest as it was.
	expect(config).toHaveLength(1);
	expect(config[0].id).toBe(0);
	expect(config[0].text).toBe('Typed over');
	expect(Object.keys(config[0].data)).toEqual(['myX', 'myY']);
	expect(config[0].arrows).toHaveLength(1);
});

test('a pointercancel in the middle of a drag ends it', async ({ page }) => {
	const chart = await editableChart(page, COLUMN);
	const a = note(chart, 0);
	const b = note(chart, 1);
	const before = await a.boundingBox();
	const start = await centre(a);

	// The press says which pointer it is, so the cancel can name the same one.
	await page.evaluate(() => {
		window.addEventListener(
			'pointerdown',
			(e) => (document.body.dataset.pointerId = String(e.pointerId)),
			{ capture: true, once: true }
		);
	});

	await pressAt(page, start);
	await page.mouse.move(start.x + 20, start.y);
	await expect.poll(async () => Math.round((await a.boundingBox()).x - before.x)).toBe(20);

	// What the browser sends when it takes the pointer away, as it does when a
	// touch turns into a scroll.
	await page.evaluate(() => {
		const pointerId = Number(document.body.dataset.pointerId);
		window.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true }));
	});

	// The button is still down, and the note has stopped following.
	await page.mouse.move(start.x + 60, start.y);
	expect(Math.round((await a.boundingBox()).x - before.x)).toBe(20);
	await page.mouse.up();

	await b.hover({ force: true });
	await expect(b).toHaveClass(/hovering/);
});

test('a context menu in the middle of a mouse drag ends it', async ({ page }) => {
	const chart = await editableChart(page, COLUMN);
	const a = note(chart, 0);
	const b = note(chart, 1);
	const before = await a.boundingBox();
	const start = await centre(a);

	// The press says which pointer it is, so the menu can name the same one.
	await page.evaluate(() => {
		window.addEventListener(
			'pointerdown',
			(e) => (document.body.dataset.pointerId = String(e.pointerId)),
			{ capture: true, once: true }
		);
	});

	await pressAt(page, start);
	await page.mouse.move(start.x + 20, start.y);
	await expect.poll(async () => Math.round((await a.boundingBox()).x - before.x)).toBe(20);

	// A menu swallows the release that would have ended the drag, as Ctrl+press does on macOS.
	await page.evaluate(() => {
		const pointerId = Number(document.body.dataset.pointerId);
		window.dispatchEvent(new PointerEvent('contextmenu', { pointerId, bubbles: true }));
	});

	// The button is still down, and the note has stopped following.
	await page.mouse.move(start.x + 60, start.y);
	expect(Math.round((await a.boundingBox()).x - before.x)).toBe(20);
	await page.mouse.up();

	await b.hover({ force: true });
	await expect(b).toHaveClass(/hovering/);
});
