import { defineConfig } from '@playwright/test';

// Vite's default, unless something else already has the port. Set PORT to move
// the dev server and the tests together.
const port = Number(process.env.PORT) || 5173;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.test.js',

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
		screenshot: 'only-on-failure',
	},

	// Configure projects for major browsers
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
				viewport: { width: 1280, height: 720 },
			},
		},
	],

	// Run your local dev server before starting the tests
	webServer: {
		command: `npm run dev -- --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},

	// Snapshot options - omit platform from path so macOS and Linux use same snapshots
	snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

	expect: {
		toHaveScreenshot: {
			maxDiffPixels: 100,
			stylePath: './tests/screenshot.css',
		},
	},
});

