import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import saveTo, { PLUGIN_HEADER, SAVE_ROUTE } from '../../src/lib/modules/saveTo.js';

/**
 * What `saveTo` sends, and what it tells the console when a save doesn't land.
 * `fetch` is stubbed: tests/unit/vitePlugin.test.js covers the server side.
 */

const realFetch = globalThis.fetch;
const realError = console.error;

afterEach(() => {
	globalThis.fetch = realFetch;
	console.error = realError;
});

/**
 * Save once, with `fetch` answering as `respond` says.
 * @param {(url: string, init: RequestInit) => Promise<Response>} respond
 * @returns {Promise<{ requests: { url: string, init: RequestInit }[], errors: string[] }>}
 */
async function saveWith(respond) {
	const requests = [];
	const errors = [];
	globalThis.fetch = /** @type {any} */ (
		(url, init) => {
			requests.push({ url, init });
			return respond(url, init);
		}
	);
	console.error = (message) => errors.push(message);

	await saveTo('src/routes/annotations.js')('[]', []);
	return { requests, errors };
}

const fromPlugin = (status, text) =>
	new Response(text, { status, headers: { [PLUGIN_HEADER]: '1' } });

test('posts the file and the source to the plugin, and says nothing when it is saved', async () => {
	const { requests, errors } = await saveWith(async () => new Response(null, { status: 204 }));

	assert.equal(requests.length, 1);
	assert.equal(requests[0].url, SAVE_ROUTE);
	assert.equal(requests[0].init.method, 'POST');
	assert.deepEqual(JSON.parse(String(requests[0].init.body)), {
		file: 'src/routes/annotations.js',
		source: '[]'
	});
	assert.deepEqual(errors, []);
});

test('a 404 from something other than the plugin asks whether the plugin is installed', async () => {
	const { errors } = await saveWith(async () => new Response('Not Found', { status: 404 }));

	assert.equal(errors.length, 1);
	assert.match(errors[0], /src\/routes\/annotations\.js/);
	assert.match(errors[0], /annotations\(\) plugin in your vite\.config\.js/);
});

test("a refusal from the plugin passes on the plugin's reason, 404 included", async () => {
	for (const { status, reason } of [
		{ status: 403, reason: 'Only a page on this dev server can save.' },
		{ status: 404, reason: "src/routes/annotations.js doesn't exist." }
	]) {
		const { errors } = await saveWith(async () => fromPlugin(status, reason));
		assert.equal(errors.length, 1, String(status));
		assert.ok(errors[0].endsWith(reason), errors[0]);
	}
});

test('a request that gets no answer asks whether the dev server is running', async () => {
	const { errors } = await saveWith(async () => {
		throw new TypeError('fetch failed');
	});

	assert.equal(errors.length, 1);
	assert.match(errors[0], /dev server running/);
});
