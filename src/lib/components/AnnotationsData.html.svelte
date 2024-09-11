<!--
  @component
  Adds text annotations that get their x and y placement using the `xScale` and `yScale`.
 -->
<script>
	import { getContext } from 'svelte';
	import Draggable from './Draggable.svelte';

	const { xGet, yGet, percentRange } = getContext('LayerCake');

	let { annotations = [], getText = (d) => d.text, pr = $percentRange, ondrag } = $props();

	let units = $derived(pr === true ? '%' : 'px');
</script>

<div class="layercake-annotations">
	{#each annotations as d}
		{@const left = `calc(${$xGet(d)}${units} + ${d.dx}%)`}
		{@const top = `calc(${$yGet(d)}${units} + ${d.dy}%)`}

		<Draggable {left} {top} {ondrag} id={d.id}>
			<div class="layercake-annotation" data-id={d.id}>
				{getText(d)}
			</div>
		</Draggable>
	{/each}
</div>

<style>
	.layercake-annotation {
		position: absolute;
	}
</style>
