/** @typedef {import('../types.js').Annotation} Annotation */

import invertScale from './invertScale.js';

/**
 * Create a new annotation at the click position
 * @param {MouseEvent} e - Click event
 * @param {number} id - Unique identifier
 * @param {Object} options - LayerCake scales and config
 * @returns {Annotation}
 */
export default function newAnnotation(e, id, { xScale, yScale, config }) {
	/** @type {[number, number]} */
	const coords = [e.offsetX, e.offsetY];

	// console.log('initial coords', coords);

	const xVal = invertScale(xScale, coords[0]);
	const yVal = invertScale(yScale, coords[1]);

	const annotation = {
		id,
		[config.x]: xVal[0],
		[config.y]: yVal[0],
		dx: xVal[1],
		dy: yVal[1],
		text: 'Enter your note here...',
		width: '155px',
		arrows: [],
		coords
	};

	return annotation;
}
