import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// The demo site is prerendered to static files for GitHub Pages. The 404
		// page stands in for GitHub's own.
		adapter: adapter({ fallback: '404.html' }),
		paths: {
			// GitHub Pages serves the demo from /<repo-name>, which the deploy
			// workflow passes in. Dev and the tests run at the root.
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		}
	}
};

export default config;
