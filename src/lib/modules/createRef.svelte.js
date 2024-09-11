/**
 * Create a state reference that can be passed between components.
 * @param {any} [data]
 */
export default function createRef(data) {
	let state = $state({ value: data });
	return state;
}
