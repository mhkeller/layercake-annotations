/**
 * Shared coordinate calculation utilities for annotations and arrows.
 *
 * Coordinate System:
 * - Annotations are positioned in DATA SPACE (using xScale/yScale)
 * - dx/dy offsets are PERCENTAGES of chart width/height
 * - Arrow source dx/dy are PIXEL offsets from annotation edge
 * - Arrow target is in DATA SPACE with optional percentage offsets
 *
 * For east arrows, source dx is relative to RIGHT edge of annotation.
 * For west arrows, source dx is relative to LEFT edge of annotation.
 */

/** Default annotation width in pixels when not explicitly set */
export const DEFAULT_ANNOTATION_WIDTH = 155;

/** Default handle offset from annotation edge in pixels */
export const HANDLE_OFFSET_PX = 12;

/**
 * Calculate annotation box position in pixels.
 *
 * @param {Object} anno - Annotation object with x/y data values and dx/dy percentage offsets
 * @param {Object} scales - Object containing LayerCake scales and accessors
 * @param {Function} scales.xScale - X scale function
 * @param {Function} scales.yScale - Y scale function
 * @param {Function} scales.x - X accessor function
 * @param {Function} scales.y - Y accessor function
 * @param {number} scales.width - Chart width in pixels
 * @param {number} scales.height - Chart height in pixels
 * @returns {{ left: number, top: number, width: number }}
 */
export function getAnnotationBox(anno, scales) {
	const { xScale, yScale, x, y, width, height } = scales;

	// Convert percentage offsets to pixels
	const offsetX = ((anno.dx ?? 0) / 100) * width;
	const offsetY = ((anno.dy ?? 0) / 100) * height;

	// Calculate top-left position
	const left = xScale(x(anno)) + offsetX;
	const top = yScale(y(anno)) + offsetY;

	// Get width (stored as "150px" string or use default)
	const annoWidth = anno.width ? parseInt(anno.width) : DEFAULT_ANNOTATION_WIDTH;

	return { left, top, width: annoWidth };
}

/**
 * Calculate arrow source position in pixels.
 *
 * @param {Object} anno - Annotation object
 * @param {Object} arrow - Arrow object with side and source offset
 * @param {Object} scales - LayerCake scales
 * @param {number} [annoHeight] - Annotation height for vertical centering (optional)
 * @returns {{ x: number, y: number }}
 */
export function getArrowSource(anno, arrow, scales, annoHeight = 0) {
	const box = getAnnotationBox(anno, scales);

	// Default offsets when no arrow source is specified
	const defaultDx = arrow.side === 'west' ? -HANDLE_OFFSET_PX : HANDLE_OFFSET_PX;
	const defaultDy = annoHeight / 2;

	const dx = arrow.source?.dx ?? defaultDx;
	const dy = arrow.source?.dy ?? defaultDy;

	let x;
	if (arrow.side === 'east') {
		// East arrow: offset from right edge
		x = box.left + box.width + dx;
	} else {
		// West arrow: offset from left edge
		x = box.left + dx;
	}

	const y = box.top + dy;

	return { x, y };
}

/**
 * Calculate arrow target position in pixels.
 *
 * @param {Object} arrow - Arrow object with target data values
 * @param {Object} scales - LayerCake scales
 * @returns {{ x: number, y: number }}
 */
export function getArrowTarget(arrow, scales) {
	const { xScale, yScale, x, y, width, height } = scales;

	// Target is in data space
	const baseX = xScale(x(arrow.target));
	const baseY = yScale(y(arrow.target));

	// Add percentage offsets (used for ordinal scales)
	const offsetX = ((arrow.target?.dx ?? 0) / 100) * width;
	const offsetY = ((arrow.target?.dy ?? 0) / 100) * height;

	return {
		x: baseX + offsetX,
		y: baseY + offsetY
	};
}

/**
 * Calculate the source dx value to store when saving an arrow.
 * Converts pixel position back to offset from annotation edge.
 *
 * @param {number} pixelX - Current X position in pixels
 * @param {Object} anno - Annotation object
 * @param {string} side - 'east' or 'west'
 * @param {Object} scales - LayerCake scales
 * @returns {number} - The dx offset to store
 */
export function calculateSourceDx(pixelX, anno, side, scales) {
	const box = getAnnotationBox(anno, scales);

	if (side === 'east') {
		// dx is offset from right edge
		return pixelX - (box.left + box.width);
	}
	// dx is offset from left edge
	return pixelX - box.left;
}

/**
 * Calculate the source dy value to store when saving an arrow.
 *
 * @param {number} pixelY - Current Y position in pixels
 * @param {Object} anno - Annotation object
 * @param {Object} scales - LayerCake scales
 * @returns {number} - The dy offset to store
 */
export function calculateSourceDy(pixelY, anno, scales) {
	const box = getAnnotationBox(anno, scales);
	return pixelY - box.top;
}

