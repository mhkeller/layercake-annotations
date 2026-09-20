import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleBand } from 'd3-scale';

import newAnnotation from '../../src/lib/modules/newAnnotation.js';
import { DEFAULT_TEXT } from '../../src/lib/modules/noteText.js';
import { getAnchorPoint, resolveAnnotation } from '../../src/lib/modules/coordinates.js';

/** A scale that inverts, the way a d3 continuous scale does. One data unit is one pixel. */
function linear() {
	const scale = (v) => v;
	scale.invert = (v) => v;
	return scale;
}

/** A chart 1000x500 with key accessors, which is what storing a position needs. */
const k = {
	xScale: linear(),
	yScale: linear(),
	x: (d) => d.myX,
	y: (d) => d.myY,
	width: 1000,
	height: 500,
	config: { x: 'myX', y: 'myY' }
};

test('a new note is pinned where it was placed, with the default text and no arrows', () => {
	const note = newAnnotation(100, 200, 3, k);

	assert.equal(note.id, 3);
	assert.deepEqual(note.data, { myX: 100, myY: 200 });
	assert.equal(note.dx, 0);
	assert.equal(note.dy, 0);
	assert.equal(note.text, DEFAULT_TEXT);
	assert.deepEqual(note.arrows, []);
	// Width is stored the way every width is: as a CSS string.
	assert.match(note.width, /^\d+px$/);

	// It draws where the click was.
	assert.deepEqual(getAnchorPoint(resolveAnnotation(note), k), { x: 100, y: 200 });
});

test("a new note can sit on the chart's top-left corner, where both positions are 0", () => {
	const note = newAnnotation(0, 0, 0, k);

	assert.equal(note.id, 0);
	assert.deepEqual(note.data, { myX: 0, myY: 0 });
	assert.deepEqual(getAnchorPoint(resolveAnnotation(note), k), { x: 0, y: 0 });
});

test('a new note on a band scale keeps its distance into the band', () => {
	// Bands 250 wide across the 1000px chart: a starts at 0, b at 250, c at 500, d at 750.
	const ordinal = { ...k, xScale: scaleBand().domain(['a', 'b', 'c', 'd']).range([0, 1000]) };

	// 300px is 50px into band b, and 50px is 5% of the chart's width.
	const note = newAnnotation(300, 200, 1, ordinal);
	assert.deepEqual(note.data, { myX: 'b', myY: 200 });
	assert.equal(note.dx, 5);
	assert.deepEqual(getAnchorPoint(resolveAnnotation(note), ordinal), { x: 300, y: 200 });
});

test('a chart whose accessors are not keys gets no note', () => {
	assert.equal(newAnnotation(100, 200, 0, { ...k, config: { x: (d) => d.myX, y: 'myY' } }), null);
	assert.equal(newAnnotation(100, 200, 0, { ...k, config: { x: 'myX', y: ['a', 'b'] } }), null);
});
