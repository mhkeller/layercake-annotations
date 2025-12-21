/**
 * Create an SVG arc path between two points.
 * Adapted from bizweekgraphics/swoopyarrows
 *
 * @param {{ x: number, y: number }} source - Start point
 * @param {{ x: number, y: number }} target - End point
 * @param {boolean|null} clockwise - Arc direction (null for straight line)
 * @param {number} [angle=Math.PI/2] - Arc angle in radians
 * @returns {string} SVG path string
 */
export function createArrowPath(source, target, clockwise, angle = Math.PI / 2) {
	// Straight line if clockwise is null
	if (clockwise === null) {
		return `M ${source.x},${source.y} L ${target.x},${target.y}`;
	}

	// Clamp angle to valid range
	angle = Math.min(Math.max(angle, 1e-6), Math.PI - 1e-6);

	// Calculate chord length between points
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const chordLength = Math.sqrt(dx * dx + dy * dy);

	// Calculate arc radius from chord length and angle
	const distance = chordLength / (2 * Math.tan(angle / 2));
	const radius = Math.sqrt(distance * distance + (chordLength / 2) * (chordLength / 2));

	// SVG arc command: M x,y a rx,ry rotation large-arc-flag,sweep-flag dx,dy
	return `M ${source.x},${source.y} a ${radius},${radius} 0 0,${clockwise ? '1' : '0'} ${dx},${dy}`;
}

