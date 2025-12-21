<script>
	import { LayerCake, Svg } from 'layercake';

	import { AnnotationsEditor, AnnotationsStatic } from '$lib/index.js';

	import Line from './_components/Line.svelte';
	import Area from './_components/Area.svelte';
	import AxisX from './_components/AxisX.svelte';
	import AxisY from './_components/AxisY.svelte';

	// This example loads csv data as json using @rollup/plugin-dsv
	import data from './_data/points.csv';

	const xKey = 'myX';
	const yKey = 'myY';

	data.forEach((d) => {
		d[yKey] = +d[yKey];
	});

	let edit = $state(true);

	let annotations = $state([
		{
			id: 0,
			myX: 1989.004181184669,
			myY: 3.6159459459459455,
			dx: 0,
			dy: 0,
			text: 'Existing annotation...',
			arrows: [],
			coords: [388, 120]
		}
	]);
</script>

<label>
	<input type="checkbox" bind:checked={edit} />
	Edit annotations
</label>

<div class="chart-container">
	<LayerCake
		padding={{ top: 28, right: 10, bottom: 20, left: 25 }}
		x={xKey}
		y={yKey}
		yDomain={[0, null]}
		{data}
	>
		<Svg>
			<AxisX />
			<AxisY ticks={4} />
			<Line />
			<Area />
		</Svg>

		{#if edit}
			<AnnotationsEditor bind:annotations />
		{:else}
			<AnnotationsStatic {annotations} />
		{/if}
	</LayerCake>
</div>

<style>
	/*
    The wrapper div needs to have an explicit width and height in CSS.
    It can also be a flexbox child or CSS grid element.
    The point being it needs dimensions since the <LayerCake> element will
    expand to fill it.
  */
	.chart-container {
		width: 100%;
		height: 250px;
	}
	label {
		margin: 14px;
		cursor: pointer;
		user-select: none;
	}
</style>
