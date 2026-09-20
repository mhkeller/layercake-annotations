import { test } from 'node:test';
import assert from 'node:assert/strict';

import toSource from '../../src/lib/modules/configSource.js';

/** Run the text as JavaScript, the way a chart that imports it would. */
function run(source) {
	return new Function(`return ${source};`)();
}

test('a config with no dates comes out exactly as JSON would write it', () => {
	const config = [
		{
			id: 0,
			data: { myX: 2002, myY: 9.873341681901799 },
			dx: 0,
			dy: -2.5,
			text: 'Says "hi"\non two lines, with a tab\t and an é',
			width: '100px',
			arrows: [
				{
					side: 'east',
					clockwise: null,
					source: { dx: -12, dy: 14 },
					target: { data: { myX: 2008.95, myY: 5.68 }, dx: 0, dy: 0 }
				}
			]
		},
		{ id: 1, data: { year: '1980', value: 14.5 }, text: ' ', arrows: [] }
	];

	assert.equal(toSource(config), JSON.stringify(config, null, 2));
});

test('empty arrays and objects, at any depth, match JSON', () => {
	for (const value of [[], {}, [[]], [{}], { a: [] }, { a: {} }, [[], {}, [{ b: [] }]]]) {
		assert.equal(toSource(value), JSON.stringify(value, null, 2));
	}
});

test('what JSON leaves out is left out the same way', () => {
	const value = {
		gone: undefined,
		fn: () => {},
		kept: 1,
		list: [undefined, () => {}, NaN, Infinity, -0, null],
		// eslint-disable-next-line no-sparse-arrays
		sparse: [1, , 3]
	};

	assert.equal(toSource(value), JSON.stringify(value, null, 2));
});

test('a date is written as new Date, in a note and in an arrow target', () => {
	const config = [
		{
			id: 0,
			data: { date: new Date('2024-03-15T00:00:00.000Z'), value: 42 },
			text: 'Peak',
			arrows: [
				{
					side: 'west',
					target: { data: { date: new Date('2024-06-01T12:30:00.000Z'), value: 7 } }
				}
			]
		}
	];
	const source = toSource(config);

	assert.ok(source.includes('"date": new Date("2024-03-15T00:00:00.000Z")'));
	assert.ok(source.includes('"date": new Date("2024-06-01T12:30:00.000Z")'));
	// Run as JavaScript, it is the same config again, dates and all.
	assert.deepEqual(run(source), config);
});

test('text that looks like a date stays text', () => {
	const config = [{ id: 0, data: { x: 1 }, text: 'new Date("2024-03-15T00:00:00.000Z")' }];
	const source = toSource(config);

	assert.equal(source, JSON.stringify(config, null, 2));
	assert.equal(run(source)[0].text, config[0].text);
});

test('a date that is not a real date is written as one that is not', () => {
	const back = run(toSource({ when: new Date('nonsense') }));

	assert.ok(back.when instanceof Date);
	assert.ok(Number.isNaN(back.when.getTime()));
});

/**
 * A small seeded generator, so the random shapes are the same on every run.
 * @param {number} seed
 */
function random(seed) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

const STRINGS = [
	'',
	'plain',
	'with "quotes"',
	'line\nbreak',
	'back\\slash',
	'é ✓ 日本',
	'\u0000\u2028',
	'</script>'
];
const KEYS = ['a', 'b c', 'date', '"quoted"', '__proto__x', '0'];

/**
 * A random value made of what a config can hold.
 * @param {() => number} next
 * @param {number} depth
 * @param {boolean} withDates
 */
function shape(next, depth, withDates) {
	const pick = Math.floor(next() * (depth > 3 ? 5 : 7));
	if (pick === 0) return null;
	if (pick === 1) return next() < 0.5;
	if (pick === 2) return (next() - 0.5) * 10 ** Math.floor(next() * 12);
	if (pick === 3) return STRINGS[Math.floor(next() * STRINGS.length)];
	if (pick === 4) {
		return withDates ? new Date(Math.floor(next() * 4e12) - 2e12) : Math.floor(next() * 100);
	}
	if (pick === 5) {
		return Array.from({ length: Math.floor(next() * 4) }, () => shape(next, depth + 1, withDates));
	}
	const object = {};
	const count = Math.floor(next() * 4);
	for (let i = 0; i < count; i++) {
		object[KEYS[Math.floor(next() * KEYS.length)]] = shape(next, depth + 1, withDates);
	}
	return object;
}

test('a thousand random shapes with no dates all match JSON', () => {
	const next = random(1);
	for (let i = 0; i < 1000; i++) {
		const value = shape(next, 0, false);
		assert.equal(toSource(value), JSON.stringify(value, null, 2));
	}
});

test('a thousand random shapes with dates all come back the same when run', () => {
	const next = random(2);
	for (let i = 0; i < 1000; i++) {
		const value = shape(next, 0, true);
		assert.deepEqual(run(toSource(value)), value);
	}
});
