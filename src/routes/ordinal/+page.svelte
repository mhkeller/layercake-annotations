<script>
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand } from 'd3-scale';
	import { AnnotationsEditor, AnnotationsStatic } from '$lib/index.js';

	import Column from './_components/Column.svelte';
	import AxisX from './_components/AxisX.svelte';
	import AxisY from './_components/AxisY.svelte';

	// This example loads csv data as json using @rollup/plugin-dsv
	import data from './_data/groups.csv';

	const xKey = 'year';
	const yKey = 'value';

	data.forEach((d) => {
		d[yKey] = +d[yKey];
	});

	let edit = $state(true);

	let annotations = $state([
		{
			id: 0,
			year: '1982',
			value: 8,
			dx: 0,
			dy: 0,
			text: 'Ordinal annotation',
			arrows: []
		}
	]);
</script>

<label>
	<input type="checkbox" bind:checked={edit} />
	Edit annotations
</label>

<div class="chart-container">
	<LayerCake
		padding={{ top: 0, right: 15, bottom: 20, left: 20 }}
		x={xKey}
		y={yKey}
		xScale={scaleBand().paddingInner(0.02).round(true)}
		xDomain={['1979', '1980', '1981', '1982', '1983']}
		yDomain={[0, null]}
		{data}
	>
		<Svg>
			<AxisX gridlines={false} />
			<AxisY snapBaselineLabel />
			<Column />
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
		height: 350px;
	}
	label {
		margin: 14px;
		cursor: pointer;
		user-select: none;
	}
</style>
