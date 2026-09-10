/**
 * Wait until the calls stop coming, then run the function once with the last
 * arguments it was given.
 * @param {Function} func - The function to run.
 * @param {number} [timeout=300] - How long the calls have to stop for, in milliseconds.
 * @returns The debounced function, which also carries `cancel` and `flush`.
 */
export default function debounce(func, timeout = 300) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	/** @type {any[]} */
	let lastArgs = [];

	const debounced = (/** @type {any[]} */ ...args) => {
		lastArgs = args;
		clearTimeout(timer);
		timer = setTimeout(() => debounced.flush(), timeout);
	};

	// Drop the call that's waiting.
	debounced.cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};

	// Run the waiting call now instead of waiting out the clock. Does nothing if
	// there isn't one.
	debounced.flush = () => {
		if (timer === undefined) return;
		clearTimeout(timer);
		timer = undefined;
		func(...lastArgs);
	};

	return debounced;
}
