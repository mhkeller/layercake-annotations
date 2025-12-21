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
	import OrdinalAxisX from './ordinal/_components/AxisX.svelte';
	import OrdinalAxisY from './ordinal/_components/AxisY.svelte';

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
			myX: 1990.3903104586989,
			myY: 10.352351582845051,
			dx: 0,
			dy: 0,
			text: 'Existing annotation...',
			width: '155px',
			arrows: [
				{
					side: 'east',
					clockwise: true,
					source: {
						dx: 12,
						dy: 12.5
					},
					target: {
						myX: 2005.8777843626654,
						myY: 6.203201922981106,
						dx: 0,
						dy: 0
					}
				}
			]
		}
	]);

	let columnAnnotations = $state([
		{
			id: 0,
			year: '1982',
			value: 14,
			dx: -6,
			dy: 0,
			text: 'Ordinal annotation with long text that should wrap',
			width: '145px',
			arrows: [
				{
					side: 'east',
					clockwise: true,
					source: { dx: 12, dy: 20 },
					target: { year: '1983', value: 10, dx: 50, dy: 0 }
				}
			]
		}
	]);
</script>

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
	.chart-container {
		width: 100%;
		height: 220px;
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
