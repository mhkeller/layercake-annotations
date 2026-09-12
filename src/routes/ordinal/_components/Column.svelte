<!--
  @component
  Generates an SVG column chart.
 -->
<script>
	import { getLayerCakeContext } from 'layercake';

	const k = getLayerCakeContext();

	/**
	 * @typedef {Object} Props
	 * @property {string} [fill='#00e047'] - The shape's fill color.
	 * @property {string} [stroke='#000'] - The shape's stroke color.
	 * @property {number} [strokeWidth=0] - The shape's stroke width.
	 * @property {boolean} [showLabels=false] - Show the numbers for each column
	 */

	/** @type {Props} */
	let { fill = '#00e047', stroke = '#000', strokeWidth = 0, showLabels = false } = $props();

	let columnWidth = $derived((d) => {
		const vals = k.xGet(d);
		return Math.abs(vals[1] - vals[0]);
	});

	let columnHeight = $derived((d) => {
		// The first render runs before the chart has been measured, so this can come
		// out negative, and an SVG rect won't take a negative height.
		return Math.max(0, k.yRange[0] - k.yGet(d));
	});
</script>

<g class="column-group">
	{#each k.data as d, i}
		{@const colHeight = columnHeight(d)}
		{@const xGot = k.xGet(d)}
		{@const xPos = Array.isArray(xGot) ? xGot[0] : xGot}
		{@const colWidth = k.xScale.bandwidth ? k.xScale.bandwidth() : columnWidth(d)}
		{@const yValue = k.y(d)}
		<rect
			class="group-rect"
			data-id={i}
			data-range={k.x(d)}
			data-count={yValue}
			x={xPos}
			y={k.yGet(d)}
			width={colWidth}
			height={colHeight}
			{fill}
			{stroke}
			stroke-width={strokeWidth}
		/>
		{#if showLabels && yValue}
			<text x={xPos + colWidth / 2} y={k.height - colHeight - 5} text-anchor="middle">{yValue}</text>
		{/if}
	{/each}
</g>

<style>
	text {
		font-size: 12px;
	}
</style>
