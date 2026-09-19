/** @typedef {import('../types.js').Annotation} Annotation */

import { invertPoint } from './coordinates.js';
import { DEFAULT_TEXT } from './noteText.js';

/** How wide a freshly placed annotation starts out, in pixels. */
const NEW_ANNOTATION_WIDTH = 91;

/**
 * Create a new annotation at a position in the chart area
 * @param {number} x - Position from the left of the chart area, in pixels.
 * @param {number} y - Position from the top of the chart area, in pixels.
 * @param {number} id - Unique identifier
 * @param {Object} k - The Layer Cake context.
 * @returns {Annotation | null} Null when the chart's accessors aren't keys, so there is nowhere to store the position.
 */
export default function newAnnotation(x, y, id, k) {
	const point = invertPoint(x, y, k);
	if (point === null) return null;

	return {
		id,
		data: point.data,
		dx: point.dx,
		dy: point.dy,
		text: DEFAULT_TEXT,
		width: `${NEW_ANNOTATION_WIDTH}px`,
		arrows: []
	};
}
