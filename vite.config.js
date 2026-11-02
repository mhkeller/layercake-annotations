import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dsv from '@rollup/plugin-dsv';

import { annotations } from './src/lib/vite.js';

export default defineConfig({
	plugins: [sveltekit(), dsv(), annotations()]
});
