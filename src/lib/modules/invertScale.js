import ordinalInvert from './ordinalInvert.js';

/**
 * The domain value at a position, plus any leftover offset within a band.
 *
 * Positions come off the page in pixels, but a chart with `percentRange` set
 * has scales whose ranges run 0-100, so the position has to be converted before
 * it goes in. Getting that wrong doesn't throw, it just puts the annotation
 * somewhere else entirely, which is why the size and the flag are required
 * rather than optional.
 *
 * @param {any} scale - The scale to invert. A d3 continuous scale has `invert`; a band scale doesn't.
 * @param {number} pos - The position, in pixels.
 * @param {number} size - The chart's width or height, whichever matches this scale.
 * @param {boolean} percentRange - Whether the chart's ranges are percentages.
 * @returns {Array} The domain value and the offset.
 */
export default function invertScale(scale, pos, size, percentRange) {
	const p = percentRange === true && size ? (pos / size) * 100 : pos;
	return scale.invert ? [scale.invert(p), 0] : ordinalInvert(scale, p);
}
