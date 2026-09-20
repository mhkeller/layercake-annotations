/**
 * Find the domain value at a given position.
 * https://stackoverflow.com/questions/20758373/inversion-with-ordinal-scale/30743306#30743306
 *
 * The answer is the band that starts at or before the position, whichever way
 * the range runs. A position ahead of every band, such as one in a padded
 * scale's outer padding, gets the nearest band and a negative offset. So a
 * scale with anything in its domain always gives a value.
 *
 * @param {any} scale - A band or point scale, which has no `invert` of its own.
 * @param {number} pos - The position to invert, in the units of the scale's range.
 * @param {number} extent - The length the offset is a percentage of, in the same units.
 * @returns {Array} - The domain value and the offset from where its band starts, as a percentage of `extent`.
 */
export default function ordinalInvert(scale, pos, extent) {
	let value = null;
	let start = -Infinity;
	let nearest = null;
	let nearestStart = Infinity;

	for (const dm of scale.domain()) {
		const bandStart = scale(dm);
		if (bandStart <= pos && bandStart > start) {
			value = dm;
			start = bandStart;
		}
		if (bandStart < nearestStart) {
			nearest = dm;
			nearestStart = bandStart;
		}
	}

	if (start === -Infinity) {
		value = nearest;
		start = nearestStart;
	}

	// An empty domain has no band to measure from.
	if (!Number.isFinite(start)) return [null, 0];

	return [value, ((pos - start) / extent) * 100];
}
