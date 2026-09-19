/**
 * Find the domain value at a given position.
 * https://stackoverflow.com/questions/20758373/inversion-with-ordinal-scale/30743306#30743306
 *
 * @param {any} scale - A band or point scale, which has no `invert` of its own.
 * @param {number} pos - The position to invert.
 * @returns {Array} - The domain value and offset.
 */
export default function ordinalInvert(scale, pos) {
	let previous = null;
	let domain = scale.domain();
	let offset = 0;

	for (let dm of domain) {
		if (scale(dm) > pos) {
			return [previous, offset];
		}
		previous = dm;
		offset = ((pos - scale(dm)) / Math.max(...scale.range())) * 100;
	}
	return [previous, offset];
}
