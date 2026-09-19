import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleBand } from 'd3-scale';

import ordinalInvert from '../../src/lib/modules/ordinalInvert.js';
import invertScale from '../../src/lib/modules/invertScale.js';

/** Three bands of 100 across a 300 range: a starts at 0, b at 100, c at 200. */
function bands() {
	return scaleBand().domain(['a', 'b', 'c']).range([0, 300]);
}

/** The same bands with outer padding: a starts at 37.5, b at 112.5, c at 187.5, each 75 wide. */
function paddedBands() {
	return bands().paddingOuter(0.5);
}

test('a position inside a band gives that band and the distance into it', () => {
	// 50 into band b, as a percentage of the 300 extent
	assert.deepEqual(ordinalInvert(bands(), 150, 300), ['b', (50 / 300) * 100]);
	// The very start of a band belongs to that band
	assert.deepEqual(ordinalInvert(bands(), 200, 300), ['c', 0]);
});

test('a position before the first band gives the first band and a negative offset', () => {
	assert.deepEqual(ordinalInvert(bands(), -30, 300), ['a', -10]);
});

test("a position in a padded scale's outer padding gives the nearest band", () => {
	const scale = paddedBands();
	assert.equal(scale('a'), 37.5);

	// 10 is left of where band a starts, so the offset reaches back from it.
	const [value, offset] = ordinalInvert(scale, 10, 300);
	assert.equal(value, 'a');
	assert.equal(offset, ((10 - 37.5) / 300) * 100);
});

test('a position past the last band gives the last band', () => {
	// Beyond the range altogether
	assert.deepEqual(ordinalInvert(bands(), 330, 300), ['c', (130 / 300) * 100]);

	// Inside the trailing outer padding: band c ends at 262.5
	const [value, offset] = ordinalInvert(paddedBands(), 290, 300);
	assert.equal(value, 'c');
	assert.equal(offset, ((290 - 187.5) / 300) * 100);
});

test('a reversed range finds the band the position is in', () => {
	// The way a y scale runs: a starts at 200, b at 100, c at 0.
	const scale = bands().range([300, 0]);
	assert.equal(scale('a'), 200);

	assert.deepEqual(ordinalInvert(scale, 250, 300), ['a', (50 / 300) * 100]);
	assert.deepEqual(ordinalInvert(scale, 150, 300), ['b', (50 / 300) * 100]);
	assert.deepEqual(ordinalInvert(scale, 50, 300), ['c', (50 / 300) * 100]);

	// Off either end there is still a value
	assert.equal(ordinalInvert(scale, 340, 300)[0], 'a');
	assert.deepEqual(ordinalInvert(scale, -30, 300), ['c', -10]);
});

test('every position along a scale gives a value from the domain', () => {
	for (const scale of [bands(), paddedBands(), bands().range([300, 0])]) {
		for (let pos = -50; pos <= 350; pos += 12.5) {
			const [value, offset] = ordinalInvert(scale, pos, 300);
			assert.ok(scale.domain().includes(value), `no value at ${pos}`);
			assert.ok(Number.isFinite(offset), `no offset at ${pos}`);
		}
	}
});

test('an empty domain gives no value and no offset', () => {
	assert.deepEqual(ordinalInvert(scaleBand().range([0, 300]), 150, 300), [null, 0]);
});

test('invertScale measures a band offset against the chart size', () => {
	// The bands cover 300px of a 1000px chart. The offset is stored as a percentage
	// of the chart, so 50px into band b is 5, whatever the range covers.
	assert.deepEqual(invertScale(bands(), 150, 1000, false), ['b', 5]);
});

test('invertScale measures a band offset against 100 when percentRange is on', () => {
	// In percent mode the range runs 0-100: a starts at 0, b at 25, c at 50.
	const scale = bands().range([0, 75]);

	// 300px across a 1000px chart is 30%, which is 5 into band b. The offset is
	// already in percent of the chart, so it comes through as it is.
	assert.deepEqual(invertScale(scale, 300, 1000, true), ['b', 5]);
});
