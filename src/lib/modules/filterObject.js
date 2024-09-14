/**
 * Filters an object by a predicate function.
 * @param {Object} obj - The object to filter.
 * @param {Function} predicate - The predicate function.
 * @returns {Object} - The filtered object.
 */
export default function filterObject(obj, predicate) {
	return Object.keys(obj).reduce((acc, key) => {
		if (predicate(obj[key])) {
			acc[key] = obj[key];
		}
		return acc;
	}, {});
}
