import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

import { annotations } from '../../src/lib/vite.js';
import { SAVE_ROUTE } from '../../src/lib/modules/saveTo.js';
import serializeAnnotations from '../../src/lib/modules/serializeAnnotations.js';

/**
 * The plugin on a real dev server, in a folder of its own. A test posts what
 * `saveTo` would and reads the file back.
 */

/** @type {string} */
let root;
/** @type {import('vite').ViteDevServer} */
let server;
/** @type {string} */
let origin;
/** Every message the server has sent the page, as `type` alone. */
const sent = [];

before(async () => {
	// The real path, since the watcher reports one: on macOS the temp folder is behind a symlink.
	root = await realpath(await mkdtemp(path.join(tmpdir(), 'layercake-annotations-')));
	await mkdir(path.join(root, 'src'));
	await writeFile(path.join(root, 'src/annotations.js'), 'export default [];\n');
	await writeFile(path.join(root, 'src/chart.annotations.js'), 'export default [];\n');
	await writeFile(path.join(root, 'src/hmr.annotations.js'), 'export default [];\n');
	await writeFile(path.join(root, 'src/other.js'), 'export default 1;\n');
	await writeFile(path.join(root, 'outside.annotations.js'), 'export default [];\n');

	server = await createServer({
		root: path.join(root, 'src'),
		configFile: false,
		logLevel: 'silent',
		server: { port: 0 },
		plugins: [annotations()]
	});
	await server.listen();
	const { port } = /** @type {import('node:net').AddressInfo} */ (server.httpServer.address());
	origin = `http://localhost:${port}`;

	const { hot } = server.environments.client;
	const send = hot.send.bind(hot);
	hot.send = (/** @type {any} */ payload, ...rest) => {
		sent.push(typeof payload === 'string' ? payload : payload.type);
		return send(payload, ...rest);
	};
});

after(async () => {
	await server.close();
	await rm(root, { recursive: true, force: true });
});

/** Post to the plugin as a page on `from` would. */
function post(body, { from = origin, method = 'POST' } = {}) {
	return fetch(origin + SAVE_ROUTE, {
		method,
		headers: { 'content-type': 'application/json', ...(from ? { origin: from } : {}) },
		body: method === 'POST' ? JSON.stringify(body) : undefined
	});
}

const read = (file) => readFile(path.join(root, file), 'utf8');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves when the server's file watcher reports a change to `file`. The
 * watcher can report several files in one turn, so the listener stays on until it sees this one.
 */
function changeOf(file) {
	const target = path.join(root, file);
	return new Promise((resolve) => {
		/** @param {string} changed */
		const listener = (changed) => {
			if (path.resolve(changed) !== target) return;
			server.watcher.off('change', listener);
			resolve(undefined);
		};
		server.watcher.on('change', listener);
	});
}

test('writes the source into the file as its default export', async () => {
	const source = '[\n  {\n    "id": 0,\n    "date": new Date("2024-03-15T00:00:00.000Z")\n  }\n]';
	const response = await post({ file: 'annotations.js', source });

	assert.equal(response.status, 204);
	assert.equal(await read('src/annotations.js'), `export default ${source};\n`);
});

test('a name that ends in .annotations.js may be written too', async () => {
	const response = await post({ file: 'chart.annotations.js', source: '[]' });
	assert.equal(response.status, 204);
});

test('refuses a request from another origin, or with none', async () => {
	const before = await read('src/annotations.js');
	for (const from of ['http://evil.example', 'http://localhost:1', null]) {
		const response = await post({ file: 'annotations.js', source: '1' }, { from });
		assert.equal(response.status, 403, `from ${from}`);
	}
	assert.equal(await read('src/annotations.js'), before);
});

test('refuses a file the include pattern does not match', async () => {
	const response = await post({ file: 'other.js', source: '[]' });
	assert.equal(response.status, 403);
	assert.equal(await read('src/other.js'), 'export default 1;\n');
});

test('refuses a file outside the root, even one with the right name', async () => {
	for (const file of ['../outside.annotations.js', path.join(root, 'outside.annotations.js')]) {
		const response = await post({ file, source: '[]' });
		assert.equal(response.status, 403, file);
		assert.match(await response.text(), /outside the project/, file);
	}
	assert.equal(await read('outside.annotations.js'), 'export default [];\n');
});

test('include and exclude take the place of the default names', async () => {
	await writeFile(path.join(root, 'src/chart.notes.js'), 'export default [];\n');
	await writeFile(path.join(root, 'src/draft.notes.js'), 'export default [];\n');
	const own = await createServer({
		root: path.join(root, 'src'),
		configFile: false,
		logLevel: 'silent',
		server: { port: 0, watch: null },
		plugins: [annotations({ include: '**/*.notes.js', exclude: '**/draft.*' })]
	});
	await own.listen();
	try {
		const { port } = /** @type {import('node:net').AddressInfo} */ (own.httpServer.address());
		const at = `http://localhost:${port}`;
		const status = async (file) =>
			(
				await fetch(at + SAVE_ROUTE, {
					method: 'POST',
					headers: { 'content-type': 'application/json', origin: at },
					body: JSON.stringify({ file, source: '[]' })
				})
			).status;

		assert.equal(await status('chart.notes.js'), 204);
		assert.equal(await status('draft.notes.js'), 403);
		assert.equal(await status('annotations.js'), 403);
	} finally {
		await own.close();
	}
});

test('takes every value serializeAnnotations writes', async () => {
	const config = [
		{
			id: 0,
			data: { date: new Date('2024-03-15T00:00:00.000Z'), value: -2.5e-7 },
			text: 'Says "hi"\non two lines, with an é and a \u2028',
			width: '100px',
			arrows: [{ side: 'east', clockwise: null, source: { dx: -12, dy: 14 } }]
		},
		{ id: 1, data: { date: new Date(NaN), value: 1e21 }, empty: {}, none: [], flag: true }
	];
	const source = serializeAnnotations(config);
	const response = await post({ file: 'annotations.js', source });

	assert.equal(response.status, 204);
	assert.equal(await read('src/annotations.js'), `export default ${source};\n`);
});

test('refuses a config that holds code, and leaves the file as it was', async () => {
	const before = await read('src/annotations.js');
	const code = [
		'[]; process.exit(1); []',
		'[] ;\nimport fs from "node:fs"',
		'(() => 1)()',
		'[fetch("/")]',
		'[{ "a": globalThis.process }]',
		'[{ [Symbol()]: 1 }]',
		'[{ get a() { return 1; } }]',
		'[{ a() {} }]',
		'[{ a }]',
		'[...[]]',
		'[`template`]',
		'[/regex/]',
		'[1n]',
		'[-"1"]',
		'[!0]',
		'[new Function("return 1")]',
		'[new Date(Date.now())]',
		'[new Date("x", 1)]',
		'[undefined]',
		'[1,'
	];
	for (const source of code) {
		const response = await post({ file: 'annotations.js', source });
		assert.equal(response.status, 400, source);
	}
	assert.equal(await read('src/annotations.js'), before);
});

test("won't replace a file that holds more than a config, even with a matching name", async () => {
	const module = 'import { x } from "./other.js";\nexport default [x];\n';
	await writeFile(path.join(root, 'src/code.annotations.js'), module);

	const response = await post({ file: 'code.annotations.js', source: '[]' });
	assert.equal(response.status, 409);
	assert.equal(await read('src/code.annotations.js'), module);
});

test('leaves nothing beside the file it writes', async () => {
	await post({ file: 'annotations.js', source: '[]' });
	const names = await readdir(path.join(root, 'src'));
	assert.deepEqual(
		names.filter((name) => name.endsWith('.tmp')),
		[]
	);
});

test("won't create a file that isn't there", async () => {
	const response = await post({ file: 'new.annotations.js', source: '[]' });
	assert.equal(response.status, 404);
	await assert.rejects(read('src/new.annotations.js'));
});

test('refuses a body that is not { file, source }, and a method that is not POST', async () => {
	assert.equal((await post({ file: 'annotations.js' })).status, 400);
	assert.equal(
		(await post({ file: 'annotations.js', source: '[]' }, { method: 'GET' })).status,
		405
	);
});

test('refuses a body over 5 MB', async () => {
	const before = await read('src/annotations.js');
	const response = await post({ file: 'annotations.js', source: `"${'x'.repeat(5_300_000)}"` });
	assert.equal(response.status, 413);
	assert.equal(await read('src/annotations.js'), before);
});

// A file of its own, so no other test's write is still on its way from the watcher.
test("a save doesn't reach the page as a hot update, and an edit by hand does", async () => {
	// Load the file, so the server knows the page has it.
	await server.environments.client.transformRequest('/hmr.annotations.js');

	sent.length = 0;
	const changed = changeOf('src/hmr.annotations.js');
	await post({ file: 'hmr.annotations.js', source: '[1]' });
	await changed;
	// Time for the server to read the file and send an update, had it been going to.
	await delay(200);
	assert.deepEqual(sent, []);

	// The server reads the new file the next time it is asked for it.
	const loaded = await server.environments.client.transformRequest('/hmr.annotations.js');
	assert.match(loaded.code, /export default \[1\]/);

	await writeFile(path.join(root, 'src/hmr.annotations.js'), 'export default [2];\n');
	for (let waited = 0; sent.length === 0 && waited < 2000; waited += 20) await delay(20);
	assert.notDeepEqual(sent, []);
});
