/** Where the Vite plugin listens on the dev server. */
export const SAVE_ROUTE = '/__layercake-annotations/save';

/** A header on every reply from the plugin, so a 404 from the plugin can be told from the server's own. */
export const PLUGIN_HEADER = 'x-layercake-annotations';

/**
 * An `onsave` that writes the config into a file, through the Vite plugin from
 * `@mhkeller/layercake-annotations/vite`. Dev only: a build has no dev server to
 * write the file.
 *
 * @param {string} file - The file to write, from the project root, like
 *   `'src/routes/annotations.js'`. It must already exist, and its name must end
 *   in `annotations.js` unless the plugin's `include` says otherwise.
 * @returns {import('../types.js').OnSaveFn}
 */
export default function saveTo(file) {
	return async (source) => {
		// fetch only rejects when the request never got an answer.
		const response = await fetch(SAVE_ROUTE, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ file, source })
		}).catch(() => null);
		if (response?.ok) return;

		const reason =
			response === null
				? 'Is the dev server running?'
				: response.status === 404 && !response.headers.has(PLUGIN_HEADER)
					? 'Is the annotations() plugin in your vite.config.js?'
					: await response.text();
		console.error(`[layercake-annotations] Couldn't save ${file}. ${reason}`);
	};
}
