import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createFilter, normalizePath, parseAst } from 'vite';

import { PLUGIN_HEADER, SAVE_ROUTE } from './modules/saveTo.js';

/** A config bigger than this is not one the editor made. */
const MAX_BODY = 5 * 1024 * 1024;

/**
 * @typedef {object} AnnotationsPluginOptions
 * @property {string | string[]} [include] - Globs, from the project root, for the
 *   files the editor may write. Default `'**\/*annotations.js'`.
 * @property {string | string[]} [exclude] - Globs for files it may not, even when
 *   `include` matches. Default `'**\/node_modules/**'`.
 */

/**
 * Lets `saveTo(file)` write the editor's config back into a file in your project
 * while the dev server runs. It does nothing in a build.
 *
 * A file it writes is not pushed to the page as a hot update, so a save doesn't
 * reload the chart mid-edit. A reload reads the new file. Edit the file by hand
 * and the page updates as usual.
 *
 * The file is written whole, as `export default <config>;`, so keep nothing else in it.
 *
 * @param {AnnotationsPluginOptions} [options]
 * @returns {import('vite').Plugin}
 */
export function annotations({
	include = '**/*annotations.js',
	exclude = '**/node_modules/**'
} = {}) {
	/** @type {Map<string, string>} What was last saved to each file, keyed by the normalized path `hotUpdate` is given. */
	const written = new Map();

	return {
		name: 'layercake-annotations',
		apply: 'serve',

		configureServer(server) {
			const { root } = server.config;
			const allowed = createFilter(include, exclude, { resolve: root });

			server.middlewares.use(SAVE_ROUTE, async (req, res) => {
				/** @param {number} status @param {string} [message] */
				const reply = (status, message = '') => {
					res.statusCode = status;
					res.setHeader(PLUGIN_HEADER, '1');
					res.setHeader('content-type', 'text/plain; charset=utf-8');
					res.end(message);
				};

				if (req.method !== 'POST') return reply(405, 'Send the config with POST.');

				// The file is code the dev server runs, so only the dev server's own pages may write it.
				if (!sameOrigin(req.headers.origin, req.headers.host)) {
					return reply(403, 'Only a page on this dev server can save.');
				}

				const text = await readBody(req);
				if (text === null) return reply(413, "That's too big to be a config the editor made.");

				let body;
				try {
					body = JSON.parse(text);
				} catch {
					// Malformed JSON gets the same answer as the wrong shape, below.
				}
				const { file, source } = body ?? {};
				if (typeof file !== 'string' || typeof source !== 'string') {
					return reply(400, 'The request should be JSON: { file, source }.');
				}

				const target = path.resolve(root, file);
				const fromRoot = path.relative(root, target);
				if (
					fromRoot === '..' ||
					fromRoot.startsWith(`..${path.sep}`) ||
					path.isAbsolute(fromRoot)
				) {
					return reply(403, `${file} is outside the project, so the editor may not write it.`);
				}
				if (!allowed(target)) {
					return reply(
						403,
						`${file} isn't a file the editor may write. Name it like annotations.js or chart.annotations.js, or set include in the plugin's options.`
					);
				}

				let found;
				try {
					found = await stat(target);
				} catch (error) {
					const { code, message } = /** @type {NodeJS.ErrnoException} */ (error);
					if (code !== 'ENOENT') return reply(500, `Couldn't read ${file}: ${message}`);
				}
				if (!found?.isFile()) {
					return reply(404, `${file} doesn't exist. Create it with export default []; first.`);
				}

				const contents = `export default ${source};\n`;
				if (!onlyData(contents)) {
					return reply(
						400,
						'The config may only hold arrays, objects, strings, numbers, true, false, null and new Date("…").'
					);
				}
				try {
					await writeFile(target, contents);
				} catch (error) {
					return reply(500, `Couldn't write ${file}: ${/** @type {Error} */ (error).message}`);
				}
				// The watcher reports the change in a later turn, so this is in place by then.
				written.set(normalizePath(target), contents);
				reply(204);
			});
		},

		hotUpdate: {
			order: 'pre',
			async handler({ file, read }) {
				const key = normalizePath(file);
				const ours = written.get(key);
				if (ours === undefined) return;
				if (ours === (await read())) return [];
				// Edited by hand. Forget the save, so the same text typed back in later updates the page.
				written.delete(key);
			}
		}
	};
}

/**
 * Whether a request came from a page served by this host. A browser always sends
 * `Origin` on a POST, so a request without one didn't come from a page.
 * @param {string | undefined} origin
 * @param {string | undefined} host
 */
function sameOrigin(origin, host) {
	if (!origin || !host) return false;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}

/**
 * Whether a module is `export default <value>;` and nothing else, where the
 * value is what `serializeAnnotations` writes: JSON, plus `new Date("…")` and
 * `new Date(NaN)`. The dev server runs this file, including on the server when
 * it renders a page, so it must not be able to hold code.
 * @param {string} contents
 */
function onlyData(contents) {
	try {
		const { body } = parseAst(contents);
		return (
			body.length === 1 &&
			body[0].type === 'ExportDefaultDeclaration' &&
			isData(body[0].declaration)
		);
	} catch {
		// A syntax error, or nesting deep enough to run out of stack.
		return false;
	}
}

/** @param {any} node - An ESTree node. */
function isData(node) {
	switch (node.type) {
		case 'Literal':
			// Regular expressions and BigInts are literals too, with other kinds of value.
			return node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value);
		case 'UnaryExpression':
			return (
				node.operator === '-' &&
				node.argument.type === 'Literal' &&
				typeof node.argument.value === 'number'
			);
		case 'ArrayExpression':
			// A null element is a hole, as in [1, , 3].
			return node.elements.every((/** @type {any} */ el) => el === null || isData(el));
		case 'ObjectExpression':
			return node.properties.every(
				(/** @type {any} */ p) =>
					p.type === 'Property' &&
					p.kind === 'init' &&
					!p.computed &&
					!p.method &&
					!p.shorthand &&
					isData(p.value)
			);
		case 'NewExpression': {
			const [arg] = node.arguments;
			return (
				node.callee.type === 'Identifier' &&
				node.callee.name === 'Date' &&
				node.arguments.length === 1 &&
				((arg.type === 'Literal' && typeof arg.value === 'string') ||
					(arg.type === 'Identifier' && arg.name === 'NaN'))
			);
		}
		default:
			return false;
	}
}

/**
 * The request body as text, or null once it passes `MAX_BODY` bytes.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string | null>}
 */
async function readBody(req) {
	let size = 0;
	/** @type {Buffer[]} */
	const chunks = [];
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY) return null;
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString('utf8');
}
