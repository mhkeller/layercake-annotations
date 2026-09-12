/** @typedef {import('../types.js').Annotation} Annotation */

import invertScale from './invertScale.js';

/**
 * Create a new annotation at the click position
 * @param {MouseEvent} e - Click event
 * @param {number} id - Unique identifier
 * @param {Object} options - LayerCake scales and config
 * @returns {Annotation}
 */
export default function newAnnotation(e, id, { xScale, yScale, config, width, height, percentRange }) {
	const xVal = invertScale(xScale, e.offsetX, width, percentRange);
	const yVal = invertScale(yScale, e.offsetY, height, percentRange);

	return {
		id,
		data: {
			[config.x]: xVal[0],
			[config.y]: yVal[0]
		},
		dx: xVal[1],
		dy: yVal[1],
		text: 'New note...',
		width: '91px',
		arrows: []
	};
}
