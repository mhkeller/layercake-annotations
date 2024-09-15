import invertScale from './invertScale.js';

export default function newAnnotation(e, id, { xScale, yScale, config }) {
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
		arrows: [],
		coords
	};

	return annotation;
}
