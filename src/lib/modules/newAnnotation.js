/** @typedef {import('../types.js').Annotation} Annotation */

import invertScale from './invertScale.js';

/** How wide a freshly placed annotation starts out, in pixels. */
const NEW_ANNOTATION_WIDTH = 91;

/**
 * Create a new annotation at a position in the chart area
 * @param {number} x - Position from the left of the chart area, in pixels.
 * @param {number} y - Position from the top of the chart area, in pixels.
 * @param {number} id - Unique identifier
 * @param {Object} options - LayerCake scales and config
 * @returns {Annotation}
 */
export default function newAnnotation(
	x,
	y,
	id,
	{ xScale, yScale, config, width, height, percentRange }
) {
	const xVal = invertScale(xScale, x, width, percentRange);
	const yVal = invertScale(yScale, y, height, percentRange);

	return {
		id,
		data: {
			[config.x]: xVal[0],
			[config.y]: yVal[0]
		},
		dx: xVal[1],
		dy: yVal[1],
		text: 'New note...',
		width: `${NEW_ANNOTATION_WIDTH}px`,
		arrows: []
	};
}
