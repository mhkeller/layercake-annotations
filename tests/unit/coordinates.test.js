import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleBand } from 'd3-scale';

import {
	getAnchorPoint,
	getBoxEdges,
	getArrowSource,
	getArrowTarget,
	calculateSourceDx,
	calculateSourceDy,
	resolveArrow,
	resolveAnnotation,
	dataKeys,
	invertPoint,
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

/**
 * An annotation the way the geometry receives one: with its defaults filled in.
 * @param {object} extra
 */
function anno(extra = {}) {
	return resolveAnnotation({ id: 0, data: { myX: 100, myY: 200 }, width: '100px', ...extra });
}

/**
 * An arrow the way the geometry receives one: with its defaults filled in.
 * @param {object} arrow
 */
function arrowOf(arrow) {
	return resolveArrow({ target: { data: { myX: 0, myY: 0 } }, ...arrow });
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
	const arrow = arrowOf({ side: 'east', source: { dx: 5, dy: 15 } });
	const expected = { x: 205, y: 215 };

	// The whole point: anchorY changes where the box is drawn, but the arrow is
	// measured from the anchor, so its source doesn't move and no height is needed.
	for (const anchorY of [0, 50, 100]) {
		assert.deepEqual(getArrowSource(anno({ anchorY }), arrow, k), expected);
	}
});

test('west arrows measure from the left edge, east from the right', () => {
	const a = anno();
	assert.equal(getArrowSource(a, arrowOf({ side: 'west', source: { dx: -12, dy: 0 } }), k).x, 88);
	assert.equal(getArrowSource(a, arrowOf({ side: 'east', source: { dx: 12, dy: 0 } }), k).x, 212);
});

test('a source with no offsets sits level with the anchor, one handle out', () => {
	const a = anno();
	assert.deepEqual(getArrowSource(a, arrowOf({ side: 'west' }), k), {
		x: 100 - HANDLE_OFFSET_PX,
		y: 200
	});
	assert.deepEqual(getArrowSource(a, arrowOf({ side: 'east' }), k), {
		x: 200 + HANDLE_OFFSET_PX,
		y: 200
	});
});

test('storing an offset round-trips back to the same pixel', () => {
	const a = anno({ anchorX: 50, anchorY: 100 });
	const dx = calculateSourceDx(260, a, 'east', k);
	const dy = calculateSourceDy(275, a, k);

	const back = getArrowSource(a, arrowOf({ side: 'east', source: { dx, dy } }), k);
	assert.deepEqual(back, { x: 260, y: 275 });
});

test('a width-less annotation falls back to the default width', () => {
	const edges = getBoxEdges(resolveAnnotation({ id: 0, data: { myX: 0, myY: 0 } }), k);
	assert.deepEqual(edges, { left: 0, right: 155, width: 155 });
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
	const arrow = resolveArrow({ side: 'east', target: { data: { myX: 500, myY: 400 } } });

	// The SVG layer arrows are drawn into carries no viewBox, so it is always in
	// pixels regardless of the scale ranges.
	assert.deepEqual(getArrowTarget(arrow, pct), { x: 500, y: 400 });
});

test('resolveArrow fills in a target that has only data', () => {
	const arrow = resolveArrow({ side: 'east', target: { data: { myX: 500, myY: 400 } } });

	assert.deepEqual(arrow.target, { data: { myX: 500, myY: 400 }, dx: 0, dy: 0 });
	assert.deepEqual(getArrowTarget(arrow, k), { x: 500, y: 400 });
});

test('resolveArrow keeps the target offsets that are set', () => {
	const arrow = resolveArrow({ side: 'east', target: { data: { myX: 'b', myY: 4 }, dx: 2.5 } });
	assert.deepEqual(arrow.target, { data: { myX: 'b', myY: 4 }, dx: 2.5, dy: 0 });
});

test('resolveArrow gives an arrow with no clockwise value a clockwise curve, on either side', () => {
	const target = { data: { myX: 0, myY: 0 } };
	assert.equal(resolveArrow({ side: 'east', target }).clockwise, true);
	assert.equal(resolveArrow({ side: 'west', target }).clockwise, true);
});

test('resolveArrow keeps a clockwise that is set, null for a straight line included', () => {
	const target = { data: { myX: 0, myY: 0 } };
	assert.equal(resolveArrow({ side: 'east', clockwise: null, target }).clockwise, null);
	assert.equal(resolveArrow({ side: 'east', clockwise: false, target }).clockwise, false);
	assert.equal(resolveArrow({ side: 'west', clockwise: true, target }).clockwise, true);
});

test('resolveArrow puts a missing source one handle out from the near edge', () => {
	const target = { data: { myX: 0, myY: 0 } };

	assert.deepEqual(resolveArrow({ side: 'west', target }).source, {
		dx: -HANDLE_OFFSET_PX,
		dy: 0
	});
	assert.deepEqual(resolveArrow({ side: 'east', target }).source, {
		dx: HANDLE_OFFSET_PX,
		dy: 0
	});

	// Half a source is filled in the same way
	assert.deepEqual(resolveArrow({ side: 'west', source: { dy: 8 }, target }).source, {
		dx: -HANDLE_OFFSET_PX,
		dy: 8
	});
	assert.deepEqual(resolveArrow({ side: 'east', source: { dx: 0 }, target }).source, {
		dx: 0,
		dy: 0
	});
});

test('resolveArrow keeps everything else and leaves its input alone', () => {
	const input = { side: 'west', source: { dx: -20, dy: 4 }, target: { data: { myX: 1, myY: 2 } } };
	const before = structuredClone(input);

	const arrow = resolveArrow(input);

	assert.deepEqual(input, before);
	assert.deepEqual(arrow, {
		side: 'west',
		clockwise: true,
		source: { dx: -20, dy: 4 },
		target: { data: { myX: 1, myY: 2 }, dx: 0, dy: 0 }
	});
	assert.notEqual(arrow.source, input.source);
	assert.notEqual(arrow.target, input.target);
});

test('resolveAnnotation fills in every default', () => {
	assert.deepEqual(resolveAnnotation({ id: 3, data: { myX: 100, myY: 200 } }), {
		id: 3,
		data: { myX: 100, myY: 200 },
		dx: 0,
		dy: 0,
		anchorX: 0,
		anchorY: 0,
		align: 'left',
		text: '',
		arrows: []
	});
});

test('resolveAnnotation keeps what is set and resolves each arrow', () => {
	const resolved = resolveAnnotation({
		id: 7,
		data: { myX: 100, myY: 200 },
		dx: -4,
		dy: 0,
		anchorX: 50,
		anchorY: 100,
		align: 'right',
		text: ' ',
		width: '120px',
		class: 'loud',
		style: 'color: red;',
		arrows: [{ side: 'west', target: { data: { myX: 1, myY: 2 } } }]
	});

	assert.deepEqual(resolved, {
		id: 7,
		data: { myX: 100, myY: 200 },
		dx: -4,
		dy: 0,
		anchorX: 50,
		anchorY: 100,
		align: 'right',
		text: ' ',
		width: '120px',
		class: 'loud',
		style: 'color: red;',
		arrows: [
			{
				side: 'west',
				clockwise: true,
				source: { dx: -HANDLE_OFFSET_PX, dy: 0 },
				target: { data: { myX: 1, myY: 2 }, dx: 0, dy: 0 }
			}
		]
	});
});

test('resolveAnnotation leaves width to annotationWidth', () => {
	const resolved = resolveAnnotation({ id: 0, data: { myX: 0, myY: 0 } });
	assert.equal('width' in resolved, false);
	assert.equal(getBoxEdges(resolved, k).width, 155);
});

test('resolveAnnotation does not change the annotation it is given', () => {
	const input = {
		id: 1,
		data: { myX: 100, myY: 200 },
		arrows: [{ side: 'east', target: { data: { myX: 1, myY: 2 } } }]
	};
	const before = structuredClone(input);

	const resolved = resolveAnnotation(input);

	assert.deepEqual(input, before);
	assert.notEqual(resolved, input);
	assert.notEqual(resolved.arrows, input.arrows);
	assert.notEqual(resolved.arrows[0], input.arrows[0]);
});

test('a bare annotation, once resolved, draws on its data point with its arrow one handle out', () => {
	const resolved = resolveAnnotation({
		id: 0,
		data: { myX: 100, myY: 200 },
		arrows: [{ side: 'east', target: { data: { myX: 500, myY: 400 } } }]
	});

	assert.deepEqual(getAnchorPoint(resolved, k), { x: 100, y: 200 });
	assert.deepEqual(getBoxEdges(resolved, k), { left: 100, right: 255, width: 155 });
	assert.deepEqual(getArrowSource(resolved, resolved.arrows[0], k), {
		x: 255 + HANDLE_OFFSET_PX,
		y: 200
	});
	assert.deepEqual(getArrowTarget(resolved.arrows[0], k), { x: 500, y: 400 });
});

/** A scale that inverts, the way a d3 continuous scale does. One data unit is one pixel. */
function linear() {
	const scale = (v) => v;
	scale.invert = (v) => v;
	return scale;
}

/** The chart above with what writing a position back needs: scales that invert and key accessors. */
const kKeys = { ...k, xScale: linear(), yScale: linear(), config: { x: 'myX', y: 'myY' } };

/**
 * Where an annotation stored at this point draws its anchor.
 * @param {object} point - What `invertPoint` returned.
 * @param {object} chart - The Layer Cake context.
 */
function drawn(point, chart) {
	return getAnchorPoint(resolveAnnotation({ id: 0, ...point }), chart);
}

test('dataKeys gives the keys when both accessors are strings or numbers', () => {
	assert.deepEqual(dataKeys({ config: { x: 'myX', y: 'myY' } }), { xKey: 'myX', yKey: 'myY' });
	// A number is a key too: the rows are arrays
	assert.deepEqual(dataKeys({ config: { x: 0, y: 1 } }), { xKey: 0, yKey: 1 });
});

test('dataKeys gives null when either accessor is a function, an array or missing', () => {
	assert.equal(dataKeys({ config: { x: (d) => d.myX, y: 'myY' } }), null);
	assert.equal(dataKeys({ config: { x: 'myX', y: (d) => d.myY } }), null);
	assert.equal(dataKeys({ config: { x: ['start', 'end'], y: 'myY' } }), null);
	assert.equal(dataKeys({ config: { x: 'myX', y: [0, 1] } }), null);
	assert.equal(dataKeys({ config: { x: 'myX' } }), null);
	assert.equal(dataKeys({ config: {} }), null);
});

test('invertPoint turns a pixel position into data on both axes', () => {
	assert.deepEqual(invertPoint(100, 200, kKeys), {
		data: { myX: 100, myY: 200 },
		dx: 0,
		dy: 0
	});
});

test('invertPoint leaves out an axis that is null or undefined', () => {
	assert.deepEqual(invertPoint(100, null, kKeys), { data: { myX: 100 }, dx: 0 });
	assert.deepEqual(invertPoint(undefined, 200, kKeys), { data: { myY: 200 }, dy: 0 });
	assert.deepEqual(invertPoint(null, null, kKeys), { data: {} });
});

test('invertPoint treats 0 as a real position', () => {
	assert.deepEqual(invertPoint(0, 0, kKeys), { data: { myX: 0, myY: 0 }, dx: 0, dy: 0 });
});

test('invertPoint stores the distance into a band as a percentage of the chart', () => {
	// Bands 250 wide across the 1000px chart: a starts at 0, b at 250, c at 500, d at 750.
	const ordinal = {
		...kKeys,
		xScale: scaleBand().domain(['a', 'b', 'c', 'd']).range([0, 1000])
	};

	// 300px is 50px into band b, and 50px is 5% of the chart's width.
	const point = invertPoint(300, 200, ordinal);
	assert.deepEqual(point, { data: { myX: 'b', myY: 200 }, dx: 5, dy: 0 });

	// The inverse of getAnchorPoint: the stored values draw at the same pixel.
	assert.deepEqual(drawn(point, ordinal), { x: 300, y: 200 });

	// Left of the first band the offset is negative, and the round trip still holds.
	const before = invertPoint(-20, 200, ordinal);
	assert.deepEqual(before, { data: { myX: 'a', myY: 200 }, dx: -2, dy: 0 });
	assert.deepEqual(drawn(before, ordinal), { x: -20, y: 200 });
});

test('invertPoint round-trips in a percentRange chart', () => {
	// Percent mode: the scales run 0-100 and their inverses take 0-100 back to data.
	const x = (v) => v / 10;
	x.invert = (v) => v * 10;
	const y = (v) => v / 5;
	y.invert = (v) => v * 5;
	const pct = { ...kKeys, percentRange: true, xScale: x, yScale: y };

	const point = invertPoint(250, 400, pct);
	assert.deepEqual(point, { data: { myX: 250, myY: 400 }, dx: 0, dy: 0 });
	assert.deepEqual(drawn(point, pct), { x: 250, y: 400 });
});

test('invertPoint gives null when the accessors are not keys', () => {
	assert.equal(invertPoint(100, 200, { ...kKeys, config: { x: (d) => d.myX, y: 'myY' } }), null);
	assert.equal(invertPoint(100, 200, { ...kKeys, config: { x: 'myX', y: ['a', 'b'] } }), null);
});
