const INDENT = '  ';

/**
 * The config as JavaScript text, ready to paste into a chart or write to a `.js` file.
 *
 * It reads like `JSON.stringify(value, null, 2)`, and for a config with no dates
 * it is exactly that. JSON has no dates: it turns a `Date` into a string, and a
 * time scale can't place a string. So a `Date` is written as `new Date("…")`,
 * which is what makes the result JavaScript rather than JSON.
 *
 * @param {unknown} value - The config, as plain objects and arrays.
 * @returns {string}
 */
export default function toSource(value) {
	return write(value, '') ?? 'undefined';
}

/**
 * One value at one depth. Follows JSON's rules for everything but a `Date`:
 * what JSON leaves out comes back as undefined, so an object can skip the key
 * and an array can write null in its place.
 * @param {any} value
 * @param {string} indent - The indent of the line this value starts on.
 * @returns {string | undefined}
 */
function write(value, indent) {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime())
			? 'new Date(NaN)'
			: `new Date(${JSON.stringify(value.toISOString())})`;
	}

	if (value === null || typeof value !== 'object') return JSON.stringify(value);
	if (typeof value.toJSON === 'function') return write(value.toJSON(), indent);

	const inner = indent + INDENT;

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		// Array.from visits the holes in a sparse array too, where map would skip them.
		const items = Array.from(value, (item) => inner + (write(item, inner) ?? 'null'));
		return `[\n${items.join(',\n')}\n${indent}]`;
	}

	const entries = [];
	for (const key of Object.keys(value)) {
		const written = write(value[key], inner);
		if (written !== undefined) entries.push(`${inner}${JSON.stringify(key)}: ${written}`);
	}
	return entries.length === 0 ? '{}' : `{\n${entries.join(',\n')}\n${indent}}`;
}
