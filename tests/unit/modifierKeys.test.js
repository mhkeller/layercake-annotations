import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasCmdOrCtrl } from '../../src/lib/modules/modifierKeys.js';

test('Cmd counts, which is the shortcut key on macOS', () => {
	assert.equal(hasCmdOrCtrl({ metaKey: true, ctrlKey: false }), true);
});

test('Ctrl counts, which is the shortcut key on Windows and Linux', () => {
	assert.equal(hasCmdOrCtrl({ metaKey: false, ctrlKey: true }), true);
});

test('both together count', () => {
	assert.equal(hasCmdOrCtrl({ metaKey: true, ctrlKey: true }), true);
});

test('no modifier, or only Alt or Shift, does not count', () => {
	assert.equal(hasCmdOrCtrl({ metaKey: false, ctrlKey: false }), false);

	const altShift = { metaKey: false, ctrlKey: false, altKey: true, shiftKey: true };
	assert.equal(hasCmdOrCtrl(altShift), false);
});
