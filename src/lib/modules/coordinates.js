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

/** @typedef {import('../types.js').ResolvedArrow} ResolvedArrow */
/** @typedef {import('../types.js').ResolvedAnnotation} ResolvedAnnotation */

import invertScale from './invertScale.js';

/** Default annotation width in pixels when not explicitly set */
export const DEFAULT_ANNOTATION_WIDTH = 155;

/** Default handle offset from annotation edge in pixels */
export const HANDLE_OFFSET_PX = 12;

/**
 * How wide the annotation is, in pixels. One predicate and one default, shared by
 * the geometry and by the elements that draw the box, so the two cannot disagree
 * about how wide it is. Width is stored as a CSS string, so it is parsed here,
 * where it is used.
 * @param {Object} anno - The annotation.
 * @returns {number}
 */
export function annotationWidth(anno) {
	const parsed = typeof anno?.width === 'number' ? anno.width : parseInt(anno?.width);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANNOTATION_WIDTH;
}

/**
 * An arrow with every default filled in. An unset source sits level with the
 * anchor, one handle out from the near edge. An unset `clockwise` curves
 * clockwise, while `null` is a real value: a straight line.
 * @param {Object} arrow - The arrow as it was written in the config.
 * @returns {ResolvedArrow}
 */
export function resolveArrow(arrow) {
	return {
		...arrow,
		clockwise: arrow.clockwise === undefined ? true : arrow.clockwise,
		source: {
			dx: arrow.source?.dx ?? (arrow.side === 'west' ? -HANDLE_OFFSET_PX : HANDLE_OFFSET_PX),
			dy: arrow.source?.dy ?? 0
		},
		target: { ...arrow.target, dx: arrow.target?.dx ?? 0, dy: arrow.target?.dy ?? 0 }
	};
}

/**
 * An annotation with every default filled in, its arrows included. Configs are
 * resolved once on the way in, so everything that draws or edits an annotation
 * reads plain values. The annotation passed in is left as it is.
 * @param {Object} anno - The annotation as it was written in the config.
 * @returns {ResolvedAnnotation}
 */
export function resolveAnnotation(anno) {
	return {
		...anno,
		dx: anno.dx ?? 0,
		dy: anno.dy ?? 0,
		anchorX: anno.anchorX ?? 0,
		anchorY: anno.anchorY ?? 0,
		align: anno.align ?? 'left',
		text: anno.text ?? '',
		arrows: (anno.arrows ?? []).map(resolveArrow)
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
 * @param {ResolvedAnnotation} anno - The annotation.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ x: number, y: number }}
 */
export function getAnchorPoint(anno, k) {
	const { xScale, yScale, x, y, width, height, percentRange } = k;
	return {
		x: toPixels(xScale(x(anno.data)), width, percentRange) + (anno.dx / 100) * width,
		y: toPixels(yScale(y(anno.data)), height, percentRange) + (anno.dy / 100) * height
	};
}

/**
 * The annotation's left and right edges. Deliberately no top or bottom: those
 * would need the height, and the height needs the DOM.
 * @param {ResolvedAnnotation} anno - The annotation.
 * @param {Object} k - The Layer Cake context.
 * @param {{ x: number, y: number }} [anchor] - The anchor point, if the caller already has it.
 * @returns {{ left: number, right: number, width: number }}
 */
export function getBoxEdges(anno, k, anchor = getAnchorPoint(anno, k)) {
	const annoWidth = annotationWidth(anno);

	// The box hangs off the anchor point, shifted by the CSS translate.
	const left = anchor.x - (anno.anchorX / 100) * annoWidth;

	return { left, right: left + annoWidth, width: annoWidth };
}

/**
 * Where an arrow leaves its annotation.
 * @param {ResolvedAnnotation} anno - The annotation.
 * @param {ResolvedArrow} arrow - The arrow, with a side and a source offset.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ x: number, y: number }}
 */
export function getArrowSource(anno, arrow, k) {
	const anchor = getAnchorPoint(anno, k);
	const { left, right } = getBoxEdges(anno, k, anchor);

	return {
		x: (arrow.side === 'east' ? right : left) + arrow.source.dx,
		y: anchor.y + arrow.source.dy
	};
}

/**
 * Where an arrow points to.
 * @param {ResolvedArrow} arrow - The arrow, whose target is a data value plus percentage nudges.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ x: number, y: number }}
 */
export function getArrowTarget(arrow, k) {
	const { xScale, yScale, x, y, width, height, percentRange } = k;
	const { data, dx, dy } = arrow.target;
	return {
		x: toPixels(xScale(x(data)), width, percentRange) + (dx / 100) * width,
		y: toPixels(yScale(y(data)), height, percentRange) + (dy / 100) * height
	};
}

/**
 * The `source.dx` to store for an arrow dragged to this position.
 * @param {number} pixelX - Where the handle ended up.
 * @param {ResolvedAnnotation} anno - The annotation.
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
 * @param {ResolvedAnnotation} anno - The annotation.
 * @param {Object} k - The Layer Cake context.
 * @returns {number}
 */
export function calculateSourceDy(pixelY, anno, k) {
	return pixelY - getAnchorPoint(anno, k).y;
}

/**
 * The keys a position is stored under in `data`. A position can only be written
 * back when the chart's `x` and `y` accessors are keys, like `x="date"`. A
 * function or an array of keys reads data fine but names nowhere to write to.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ xKey: string | number, yKey: string | number } | null}
 */
export function dataKeys(k) {
	const { x, y } = k.config;
	const isKey = (/** @type {unknown} */ key) => typeof key === 'string' || typeof key === 'number';
	return isKey(x) && isKey(y) ? { xKey: x, yKey: y } : null;
}

/**
 * The `data`, `dx` and `dy` to store for an anchor point or an arrow target at
 * this position. The inverse of `getAnchorPoint`.
 *
 * An axis passed as null or undefined didn't move, so it is left out of the
 * result and the caller's own values for it stand. The test is for null and
 * not for truthiness: 0 is a real position, on the chart's left or top edge.
 * @param {number | null | undefined} pixelX - Position from the left of the chart area, in pixels.
 * @param {number | null | undefined} pixelY - Position from the top of the chart area, in pixels.
 * @param {Object} k - The Layer Cake context.
 * @returns {{ data: Record<string, unknown>, dx?: number, dy?: number } | null} Null when the chart's accessors aren't keys.
 */
export function invertPoint(pixelX, pixelY, k) {
	const keys = dataKeys(k);
	if (keys === null) return null;

	/** @type {{ data: Record<string, unknown>, dx?: number, dy?: number }} */
	const point = { data: {} };

	if (pixelX != null) {
		const [value, offset] = invertScale(k.xScale, pixelX, k.width, k.percentRange);
		point.data[keys.xKey] = value;
		point.dx = offset;
	}
	if (pixelY != null) {
		const [value, offset] = invertScale(k.yScale, pixelY, k.height, k.percentRange);
		point.data[keys.yKey] = value;
		point.dy = offset;
	}

	return point;
}
