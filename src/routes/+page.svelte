<script>
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand } from 'd3-scale';

	import { Annotations } from '$lib/index.js';

	// Line chart components
	import Line from './_components/Line.svelte';
	import Area from './_components/Area.svelte';
	import AxisX from './_components/AxisX.svelte';
	import AxisY from './_components/AxisY.svelte';

	// Column chart components
	import Column from './ordinal/_components/Column.svelte';
	import OrdinalAxisX from './_components/AxisX.svelte';
	import OrdinalAxisY from './_components/AxisY.svelte';

	// Data
	import lineData from './_data/points.csv';
	import columnData from './ordinal/_data/groups.csv';

	// Line chart config
	const lineXKey = 'myX';
	const lineYKey = 'myY';
	lineData.forEach((d) => {
		d[lineYKey] = +d[lineYKey];
	});

	// Column chart config
	const colXKey = 'year';
	const colYKey = 'value';
	columnData.forEach((d) => {
		d[colYKey] = +d[colYKey];
	});

	let editable = $state(true);

	let lineAnnotations = $state([
		{
			id: 0,
			data: { myX: 1995, myY: 5 },
			dx: 0,
			dy: 0,
			text: 'Annotation text',
			width: '100px',
			arrows: [
				{
					side: 'east',
					clockwise: true,
					source: { dx: 0, dy: 10 },
					target: { data: { myX: 2010, myY: 4.5 }, dx: 0, dy: 0 }
				}
			]
		}
	]);

	let columnAnnotations = $state([
		{
			id: 0,
			data: { year: '1981', value: 8 },
			dx: 0,
			dy: 0,
			text: 'Annotation text',
			width: '100px',
			arrows: [
				{
					side: 'east',
					clockwise: true,
					source: { dx: 0, dy: 10 },
					target: { data: { year: '1982', value: 8.5 }, dx: 0, dy: 0 }
				}
			]
		}
	]);
</script>

<svelte:head>
	<title>Layer Cake Annotations</title>
</svelte:head>

<div class="page">
	<header>
		<div class="masthead">
			<img class="logo" src="favicon.png" alt="" width="64" height="64" />
			<h1>Layer Cake <br />annotations</h1>
		</div>
		<div class="intro">
			<p>
				Click a chart to add an annotation. Drag it to move it and double-click to edit its text.
				Hover it to show its handles: drag a circle outward to draw an arrow, or drag the diamond to
				move its anchor point. Command-click an arrow's control point to change its swoopiness.
			</p>
			<p>
				Changes are logged to the browser console. You can paste that config object into your own
				chart.
			</p>
			<div class="controls">
				<label class="toggle">
					<input type="checkbox" bind:checked={editable} />
					Edit annotations
				</label>
				<a class="docs" href="https://github.com/mhkeller/layercake-annotations">Docs</a>
			</div>
		</div>
	</header>

	<section>
		<h2>
			<span class="swatch circle"></span>Line chart <span class="kind">continuous scales</span>
		</h2>
		<div class="chart-container line">
			<LayerCake
				padding={{ top: 28, right: 10, bottom: 20, left: 25 }}
				x={lineXKey}
				y={lineYKey}
				yDomain={[0, null]}
				data={lineData}
			>
				<Svg>
					<defs>
						<pattern id="dot-screen" width="9" height="9" patternUnits="userSpaceOnUse">
							<circle cx="4.5" cy="4.5" r="1.6" fill="#e2401c" />
						</pattern>
					</defs>
					<AxisX />
					<AxisY ticks={4} />
					<Line stroke="#141414" />
					<Area fill="url(#dot-screen)" />
				</Svg>

				<Annotations bind:annotations={lineAnnotations} {editable} />
			</LayerCake>
		</div>
	</section>

	<section>
		<h2><span class="swatch square"></span>Column chart <span class="kind">ordinal scale</span></h2>
		<div class="chart-container ordinal">
			<LayerCake
				padding={{ top: 0, right: 15, bottom: 20, left: 20 }}
				x={colXKey}
				y={colYKey}
				xScale={scaleBand().paddingInner(0.02).round(true)}
				xDomain={['1979', '1980', '1981', '1982', '1983']}
				yDomain={[0, null]}
				data={columnData}
			>
				<Svg>
					<OrdinalAxisX gridlines={false} />
					<OrdinalAxisY snapBaselineLabel />
					<Column fill="#1f4e9c" />
				</Svg>
				<Annotations bind:annotations={columnAnnotations} {editable} />
			</LayerCake>
		</div>
	</section>
</div>

<style>
	.page {
		padding: 28px 32px 24px;
		/* The layout is a column the height of the window. Without this, a window
		   shorter than the page squeezes the charts rather than scrolling. */
		flex: none;
		/* On a narrow screen a wide annotation can run past the chart. Cut it off at
		   the edge rather than letting the page scroll sideways. */
		overflow-x: clip;
	}

	/* Line heights in whole pixels keep the charts below on whole pixels too. */
	header {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		gap: 20px 48px;
		align-items: end;
		padding-bottom: 20px;
		border-bottom: 6px solid var(--ink);
	}
	.masthead {
		display: flex;
		align-items: flex-end;
		gap: 16px;
	}
	.logo {
		display: block;
		flex: none;
	}
	/* The Layer Cake site's wordmark font. SignPainter ships with macOS. */
	h1 {
		margin: 0;
		font-family: 'SignPainter', 'SignPainter-HouseScript', Helvetica, sans-serif;
		font-weight: 400;
		font-size: 54px;
		line-height: 44px;
	}
	.intro p {
		margin: 0 0 14px;
		font-size: 15px;
		line-height: 22px;
		color: var(--muted);
		max-width: 38em;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 28px;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 15px;
		line-height: 22px;
		font-weight: 500;
		cursor: pointer;
		user-select: none;
	}
	.toggle input {
		appearance: none;
		margin: 0;
		width: 20px;
		height: 20px;
		border: 2px solid var(--ink);
		background: transparent;
		cursor: pointer;
	}
	.toggle input:checked {
		background: var(--yellow)
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 8.5l3.2 3L13 4.5' fill='none' stroke='%23141414' stroke-width='2.5'/%3E%3C/svg%3E")
			center / 14px no-repeat;
	}
	.toggle input:focus-visible,
	.docs:focus-visible {
		outline: 2px solid var(--blue);
		outline-offset: 3px;
	}

	.docs {
		font-size: 15px;
		line-height: 22px;
		font-weight: 500;
		color: var(--ink);
		text-decoration: none;
		border-bottom: 3px solid var(--yellow);
	}
	.docs::after {
		content: ' →';
	}
	.docs:hover {
		background: var(--yellow);
	}

	section {
		margin-top: 20px;
	}
	h2 {
		font-family: var(--display);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px 10px;
		margin: 0 0 6px;
		/* On a narrow screen, wrap between phrases rather than inside them. */
		white-space: nowrap;
		font-size: 13px;
		line-height: 18px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.kind {
		font-weight: 400;
		color: var(--muted);
	}
	.swatch {
		width: 12px;
		height: 12px;
	}
	.swatch.circle {
		border-radius: 50%;
		background: var(--red);
	}
	.swatch.square {
		background: var(--blue);
	}

	.chart-container {
		width: 100%;
		height: 220px;
		/* Annotation text size. The notes' box widths are set to wrap 15px text where they do. */
		font-size: 15px;
	}
	.chart-container.ordinal {
		height: 280px;
	}
	.chart-container :global(.axis .tick text) {
		fill: var(--muted);
	}
	.chart-container :global(.axis .tick line) {
		stroke: #bdb5a6;
	}
	.chart-container :global(.path-line) {
		stroke-width: 3;
	}

	@media (max-width: 760px) {
		.page {
			padding: 20px 16px 24px;
		}
		header {
			grid-template-columns: minmax(0, 1fr);
		}
		h1 {
			font-size: 42px;
			line-height: 34px;
		}
		.logo {
			width: 52px;
			height: 52px;
		}
	}
</style>
