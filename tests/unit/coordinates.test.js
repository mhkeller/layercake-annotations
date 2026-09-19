import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	getAnchorPoint,
	getBoxEdges,
	getArrowSource,
	getArrowTarget,
	calculateSourceDx,
	calculateSourceDy,
	HANDLE_OFFSET_PX
} from '../../src/lib/modules/coordinates.js';
import invertScale from '../../src/lib/modules/invertScale.js';

/** A chart 1000x500, where one data unit is one pixel. */
const k = {
	xScale: (v) => v,
	yScale: (v) => v,
	x: (d) => d.myX,
	y: (d) => d.myY,
	width: 1000,
	height: 500
};

/** @param {object} extra */
function anno(extra = {}) {
	return { id: 0, data: { myX: 100, myY: 200 }, dx: 0, dy: 0, width: '100px', ...extra };
}

test('the anchor point is the data position plus the percentage nudges', () => {
	assert.deepEqual(getAnchorPoint(anno(), k), { x: 100, y: 200 });
	// dx is a percentage of chart width, dy of chart height
	assert.deepEqual(getAnchorPoint(anno({ dx: 10, dy: -20 }), k), { x: 200, y: 100 });
});

test('the box hangs off the anchor by anchorX', () => {
	assert.deepEqual(getBoxEdges(anno(), k), { left: 100, right: 200, width: 100 });
	// anchored on its right edge, so the box sits to the left of the data point
	assert.deepEqual(getBoxEdges(anno({ anchorX: 100 }), k), { left: 0, right: 100, width: 100 });
	assert.deepEqual(getBoxEdges(anno({ anchorX: 50 }), k), { left: 50, right: 150, width: 100 });
});

test('arrow source needs no height, at any anchorY', () => {
	const arrow = { side: 'east', source: { dx: 5, dy: 15 } };
	const expected = { x: 205, y: 215 };

	// The whole point: anchorY changes where the box is drawn, but the arrow is
	// measured from the anchor, so its source doesn't move and no height is needed.
	for (const anchorY of [0, 50, 100]) {
		assert.deepEqual(getArrowSource(anno({ anchorY }), arrow, k), expected);
	}
});

test('west arrows measure from the left edge, east from the right', () => {
	const a = anno();
	assert.equal(getArrowSource(a, { side: 'west', source: { dx: -12, dy: 0 } }, k).x, 88);
	assert.equal(getArrowSource(a, { side: 'east', source: { dx: 12, dy: 0 } }, k).x, 212);
});

test('a source with no offsets sits level with the anchor, one handle out', () => {
	const a = anno();
	assert.deepEqual(getArrowSource(a, { side: 'west' }, k), {
		x: 100 - HANDLE_OFFSET_PX,
		y: 200
	});
	assert.deepEqual(getArrowSource(a, { side: 'east' }, k), {
		x: 200 + HANDLE_OFFSET_PX,
		y: 200
	});
});

test('storing an offset round-trips back to the same pixel', () => {
	const a = anno({ anchorX: 50, anchorY: 100 });
	const dx = calculateSourceDx(260, a, 'east', k);
	const dy = calculateSourceDy(275, a, k);

	const back = getArrowSource(a, { side: 'east', source: { dx, dy } }, k);
	assert.deepEqual(back, { x: 260, y: 275 });
});

test('a width-less annotation falls back to the default width', () => {
	const { width } = getBoxEdges({ data: { myX: 0, myY: 0 }, dx: 0, dy: 0 }, k);
	assert.equal(width, 155);
});

test('invertScale converts pixels to percentages when percentRange is on', () => {
	// A scale whose range is 0-100 because the chart is in percent mode.
	const pct = (v) => v;
	pct.invert = (v) => v;

	// 250px across a 1000px chart is 25% of the way in.
	assert.deepEqual(invertScale(pct, 250, 1000, true), [25, 0]);

	// With pixel ranges the position goes straight through.
	assert.deepEqual(invertScale(pct, 250, 1000, false), [250, 0]);
});

test('invertScale leaves band scales alone but still converts the position', () => {
	const band = (v) => ({ a: 0, b: 50, c: 100 })[v];
	band.domain = () => ['a', 'b', 'c'];
	band.range = () => [0, 100];

	// 600px of a 1000px chart is 60%, which lands in band 'b'.
	const [value] = invertScale(band, 600, 1000, true);
	assert.equal(value, 'b');
});

test('percentRange scales are converted to pixels before the offsets are added', () => {
	// The same chart in percent mode: the scales emit 0-100 rather than pixels.
	// myX 100 lands at 10% of 1000px, myY 200 at 40% of 500px - the same places
	// the pixel-mode chart puts them, which is the point.
	const pct = { ...k, percentRange: true, xScale: (v) => v / 10, yScale: (v) => v / 5 };

	assert.deepEqual(getAnchorPoint(anno(), pct), getAnchorPoint(anno(), k));
	assert.deepEqual(getAnchorPoint(anno(), pct), { x: 100, y: 200 });

	// dx/dy are already percentages of the chart, so they must survive untouched:
	// 10% of 1000 to the right, 20% of 500 up.
	assert.deepEqual(getAnchorPoint(anno({ dx: 10, dy: -20 }), pct), { x: 200, y: 100 });
});

test('an arrow target in a percentRange chart lands in pixels too', () => {
	const pct = { ...k, percentRange: true, xScale: (v) => v / 10, yScale: (v) => v / 5 };
	const arrow = { side: 'east', target: { data: { myX: 500, myY: 400 }, dx: 0, dy: 0 } };

	// The SVG layer arrows are drawn into carries no viewBox, so it is always in
	// pixels regardless of the scale ranges.
	assert.deepEqual(getArrowTarget(arrow, pct), { x: 500, y: 400 });
});
