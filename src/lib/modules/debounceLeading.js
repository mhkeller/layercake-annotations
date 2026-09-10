/**
 * Run the function right away, then ignore the calls that follow until they've
 * stopped coming for the length of the window.
 * @param {Function} func - The function to run.
 * @param {number} [timeout=300] - How long the calls have to stop for before the next one runs, in milliseconds.
 * @returns The debounced function, which also carries `cancel`.
 */
export default function debounceLeading(func, timeout = 300) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	const debounced = (/** @type {any[]} */ ...args) => {
		// Run it if the window is open, otherwise just push the window back.
		if (timer === undefined) {
			func(...args);
		} else {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			timer = undefined;
		}, timeout);
	};

	// Reopen the window so the next call runs right away.
	debounced.cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};

	return debounced;
}
