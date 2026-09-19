/**
 * Where annotations and arrows sit, in pixels.
 *
 * The one rule everything here follows:
 *
 *   An annotation has exactly one point whose position is knowable from its
 *   config: the anchor point. Width is stored, so the left and right edges are
 *   knowable too. Height is not stored — it comes out of how the text wraps —
 *   so no other vertical position can be worked out without measuring the DOM.
 *
 * So arrows are hung off what is knowable. `source.dx` is pixels from the near
 * edge, and `source.dy` is pixels down from the anchor point. Nothing in here
 * needs a measured height, which is what lets published charts draw arrows
 * correctly without measuring anything.
 *
 * To put an arrow at the middle or the bottom of the box, move the anchor there
 * with `anchorY` and leave `source.dy` at 0. The browser resolves `anchorY`
 * against the real box, so that keeps working when the text re-wraps.
 *
 * dx/dy on the annotation itself are percentages of the chart. dx/dy on an
 * arrow source are pixels. An arrow target is in data space.
 */

/** Default annotation width in pixels when not explicitly set */
export const DEFAULT_ANNOTATION_WIDTH = 155;

/** Default handle offset from annotation edge in pixels */
export const HANDLE_OFFSET_PX = 12;

/**
 * How wide the annotation is, in pixels. One predicate and one default, shared by
 * the geometry and by the elements that draw the box, so the two cannot disagree
 * about how wide it is.
 * @param {Object} anno - The annotation.
 * @returns {number}
 */
export function annotationWidth(anno) {
	const parsed = typeof anno?.width === 'number' ? anno.width : parseInt(anno?.width);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANNOTATION_WIDTH;
}

/**
 * An arrow's source offsets with the defaults filled in: `dx` is pixels from the
 * near edge, `dy` is pixels down from the anchor point. The read path and the two
 * write paths all come through here, so an unset source means the same everywhere.
 * @param {Object} arrow - The arrow, with a side and an optional source.
 * @returns {{ dx: number, dy: number }}
 */
export function resolveArrowSource(arrow) {
	return {
		dx: arrow.source?.dx ?? (arrow.side === 'west' ? -HANDLE_OFFSET_PX : HANDLE_OFFSET_PX),
		dy: arrow.source?.dy ?? 0
	};
}

/**
 * A scale's output in pixels.
 *
 * With `percentRange` the scales emit 0-100 instead of pixels, but everything
 * drawn from them is measured in pixels: the SVG layer arrows live in carries no
 * viewBox, and the box's `left` is a pixel offset. So the conversion belongs here,
 * once. This is the mirror of what `invertScale` does on the way back in.
 *
 * @param {number} value - What the scale returned.
 * @param {number} size - The chart's width or height, whichever matches the scale.
 * @param {boolean} percentRange - Whether the chart's ranges are percentages.
 * @returns {number}
 */
function toPixels(value, size, percentRange) {
	return percentRange === true ? (value / 100) * size : value;
}

/**
 * The annotation's anchor point — the spot that pins to the data point, and the
 * only vertical position knowable without measuring.
 * @param {Object} anno - The annotation.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ x: number, y: number }}
 */
export function getAnchorPoint(anno, k) {
	const { xScale, yScale, x, y, width, height, percentRange } = k;
	return {
		x: toPixels(xScale(x(anno.data)), width, percentRange) + ((anno.dx ?? 0) / 100) * width,
		y: toPixels(yScale(y(anno.data)), height, percentRange) + ((anno.dy ?? 0) / 100) * height
	};
}

/**
 * The annotation's left and right edges. Deliberately no top or bottom: those
 * would need the height, and the height needs the DOM.
 * @param {Object} anno - The annotation.
 * @param {Object} k - The Layer Cake context.
 * @param {{ x: number, y: number }} [anchor] - The anchor point, if the caller already has it.
 * @returns {{ left: number, right: number, width: number }}
 */
export function getBoxEdges(anno, k, anchor = getAnchorPoint(anno, k)) {
	const annoWidth = annotationWidth(anno);

	// The box hangs off the anchor point, shifted by the CSS translate.
	const left = anchor.x - ((anno.anchorX ?? 0) / 100) * annoWidth;

	return { left, right: left + annoWidth, width: annoWidth };
}

/**
 * Where an arrow leaves its annotation.
 * @param {Object} anno - The annotation.
 * @param {Object} arrow - The arrow, with a side and an optional source offset.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ x: number, y: number }}
 */
export function getArrowSource(anno, arrow, k) {
	const anchor = getAnchorPoint(anno, k);
	const { left, right } = getBoxEdges(anno, k, anchor);
	const { dx, dy } = resolveArrowSource(arrow);

	return {
		x: (arrow.side === 'east' ? right : left) + dx,
		y: anchor.y + dy
	};
}

/**
 * Where an arrow points to.
 * @param {Object} arrow - The arrow, whose target is a data value plus optional percentage nudges.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ x: number, y: number }}
 */
export function getArrowTarget(arrow, k) {
	const { xScale, yScale, x, y, width, height, percentRange } = k;
	return {
		x:
			toPixels(xScale(x(arrow.target.data)), width, percentRange) +
			((arrow.target?.dx ?? 0) / 100) * width,
		y:
			toPixels(yScale(y(arrow.target.data)), height, percentRange) +
			((arrow.target?.dy ?? 0) / 100) * height
	};
}

/**
 * The `source.dx` to store for an arrow dragged to this position.
 * @param {number} pixelX - Where the handle ended up.
 * @param {Object} anno - The annotation.
 * @param {string} side - 'east' or 'west'.
 * @param {Object} k - The Layer Cake context.
 * @returns {number}
 */
export function calculateSourceDx(pixelX, anno, side, k) {
	const { left, right } = getBoxEdges(anno, k);
	return pixelX - (side === 'east' ? right : left);
}

/**
 * The `source.dy` to store for an arrow dragged to this position.
 * @param {number} pixelY - Where the handle ended up.
 * @param {Object} anno - The annotation.
 * @param {Object} k - The Layer Cake context.
 * @returns {number}
 */
export function calculateSourceDy(pixelY, anno, k) {
	return pixelY - getAnchorPoint(anno, k).y;
}
