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
	const xVal = invertScale(xScale, e.offsetX);
	const yVal = invertScale(yScale, e.offsetY);

	return {
		id,
		[config.x]: xVal[0],
		[config.y]: yVal[0],
		dx: xVal[1],
		dy: yVal[1],
		text: 'Enter your note here...',
		width: '168px',
		arrows: []
	};
}
