<!--
  @component
  Adds text annotations that get their x and y placement using the `xScale` and `yScale`.
 -->
<script>
	import { getContext } from 'svelte';

	const { xGet, yGet, percentRange } = getContext('LayerCake');

	let { annotations = $bindable([]), getText = (d) => d.text } = $props();

	let units = $derived($percentRange === true ? '%' : 'px');
</script>

<div class="layercake-annotations">
	{#each annotations as d, i}
		<div
			class="layercake-annotation"
			data-id={i}
			style:left={`calc(${$xGet(d)}${units} + ${d.dx || 0}px)`}
			style:top={`calc(${$yGet(d)}${units} + ${d.dy || 0}px)`}
		>
			{getText(d)}
		</div>
	{/each}
</div>

<style>
	.layercake-annotation {
		position: absolute;
		padding: 3px;
		border: 1px solid transparent;
	}
</style>
