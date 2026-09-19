/**
 * The anchor positions Option+click steps through, clockwise from top-left.
 * Shared so the editor's cycle and the tests that walk it can't fall out of step.
 * @type {Array<{x: number, y: number}>}
 */
export const ANCHOR_PRESETS = [
	{ x: 0, y: 0 }, // top-left (default)
	{ x: 50, y: 0 }, // top-center
	{ x: 100, y: 0 }, // top-right
	{ x: 100, y: 50 }, // middle-right
	{ x: 100, y: 100 }, // bottom-right
	{ x: 50, y: 100 }, // bottom-center
	{ x: 0, y: 100 }, // bottom-left
	{ x: 0, y: 50 }, // middle-left
	{ x: 50, y: 50 } // center
];
