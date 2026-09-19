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

<header>
	<h1>Layer Cake Annotations</h1>
	<p>
		Click a chart to add an annotation. Drag it to move it and double-click to edit its text. Hover
		it to show its handles: drag a circle outward to draw an arrow, or drag the diamond to move its
		anchor point. Changes are logged to the browser console as config you can paste into your own
		chart.
	</p>
	<p>
		<a href="https://github.com/mhkeller/layercake-annotations#readme">Docs and every control</a> ·
		<a href="https://www.npmjs.com/package/@mhkeller/layercake-annotations">npm</a>
	</p>
</header>

<label>
	<input type="checkbox" bind:checked={editable} />
	Edit annotations
</label>

<h3>Line Chart (continuous scales)</h3>
<div class="chart-container line">
	<LayerCake
		padding={{ top: 28, right: 10, bottom: 20, left: 25 }}
		x={lineXKey}
		y={lineYKey}
		yDomain={[0, null]}
		data={lineData}
	>
		<Svg>
			<AxisX />
			<AxisY ticks={4} />
			<Line />
			<Area />
		</Svg>

		<Annotations bind:annotations={lineAnnotations} {editable} />
	</LayerCake>
</div>

<h3>Column Chart (ordinal scale)</h3>
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
			<Column />
		</Svg>
		<Annotations bind:annotations={columnAnnotations} {editable} />
	</LayerCake>
</div>

<style>
	header {
		margin: 14px 14px 4px;
		max-width: 48em;
	}
	/* Line heights in whole pixels keep the charts below on whole pixels too. */
	h1 {
		margin: 0 0 6px;
		font-size: 20px;
		line-height: 24px;
	}
	header p {
		margin: 0 0 6px;
		font-size: 14px;
		line-height: 20px;
		color: #444;
	}
	.chart-container {
		width: 100%;
		height: 220px;
		/* The layout is a column the height of the window. Without this, a window
		   shorter than the page squeezes the charts rather than scrolling. */
		flex: none;
	}
	.chart-container.ordinal {
		height: 280px;
	}
	label {
		margin: 14px;
		cursor: pointer;
		user-select: none;
	}
	h3 {
		margin: 20px 14px 5px;
		font-size: 14px;
		color: #666;
	}
</style>
