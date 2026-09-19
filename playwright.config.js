import { defineConfig } from '@playwright/test';

// The dev server port from .claude/launch.json, off Vite's shared default. Set
// PORT to move the dev server and the tests together.
const port = Number(process.env.PORT) || 5273;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.test.js',
	// tests/unit runs under node, not a browser
	testIgnore: '**/unit/**',

	// Run tests in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Reporter
	reporter: process.env.CI ? 'github' : 'html',

	use: {
		// Base URL for navigation
		baseURL,

		// Collect trace when retrying the failed test
		trace: 'on-first-retry',

		// Screenshot on failure
		screenshot: 'only-on-failure'
	},

	// Configure projects for major browsers
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				// Tall enough to show the whole demo page without scrolling. Several
				// tests hover an annotation and then screenshot it, and a scroll in
				// between moves the annotation out from under the pointer.
				viewport: { width: 1280, height: 900 }
			}
		}
	],

	// Run your local dev server before starting the tests
	webServer: {
		command: `npm run dev -- --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	},

	// Snapshot options - omit platform from path so macOS and Linux use same snapshots
	snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

	expect: {
		toHaveScreenshot: {
			maxDiffPixels: 100,
			stylePath: './tests/screenshot.css'
		}
	}
});
