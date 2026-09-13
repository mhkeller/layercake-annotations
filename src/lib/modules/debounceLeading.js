/**
 * Run the function right away, then drop the calls that follow for the length of
 * the window. The window always ends on time; a call inside it doesn't push it back.
 * @param {Function} func - The function to run.
 * @param {number} [timeout=300] - How long calls are dropped for after one runs, in milliseconds.
 * @returns The debounced function.
 */
export default function debounceLeading(func, timeout = 300) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	const debounced = (/** @type {any[]} */ ...args) => {
		// A call inside the window is dropped and leaves the window's end time alone.
		if (timer !== undefined) return;

		func(...args);
		timer = setTimeout(() => {
			timer = undefined;
		}, timeout);
	};

	return debounced;
}
