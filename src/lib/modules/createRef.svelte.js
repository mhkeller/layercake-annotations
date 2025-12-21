/**
 * Create a state reference that can be passed between components.
 * @template T
 * @param {T} [data]
 * @returns {import('../types.js').Ref<T>}
 */
export default function createRef(data) {
	let state = $state({ value: data });
	return state;
}
