import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_TEXT, finalText } from '../../src/lib/modules/noteText.js';

test('the default text is what a new note says', () => {
	assert.equal(DEFAULT_TEXT, 'New note...');
});

test('a blank note is given the default text', () => {
	assert.equal(finalText(''), DEFAULT_TEXT);
});

test('an emptied edit box that still holds line breaks counts as blank', () => {
	assert.equal(finalText('\n'), DEFAULT_TEXT);
	assert.equal(finalText('\n\n'), DEFAULT_TEXT);
	assert.equal(finalText('\r\n'), DEFAULT_TEXT);
});

test('whitespace-only text is kept as typed, for an arrow with no label', () => {
	assert.equal(finalText(' '), ' ');
	// Only the trailing line break goes
	assert.equal(finalText(' \n'), ' ');
});

test('trailing line breaks and surrounding spaces are trimmed off real text', () => {
	assert.equal(finalText('a\n\n'), 'a');
	assert.equal(finalText('  hi  '), 'hi');
});

test('line breaks inside the text stay', () => {
	assert.equal(finalText('one\ntwo\n'), 'one\ntwo');
});
