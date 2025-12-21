<!--
  @component
  Adds text annotations that get their x and y placement using the `xScale` and `yScale`.
 -->
<script>
	/** @typedef {import('../types.js').Annotation} Annotation */

	import { getContext } from 'svelte';

	const { xGet, yGet, percentRange } = getContext('LayerCake');

	/** @type {{ annotations?: Annotation[], getText?: (d: Annotation) => string }} */
	let { annotations = $bindable([]), getText = (d) => d.text } = $props();

	let units = $derived($percentRange === true ? '%' : 'px');
</script>

<div class="layercake-annotations">
	{#each annotations as d, i}
		<!-- Wrapper mirrors Draggable structure -->
		<div
			class="static-wrapper"
			data-id={i}
			style:left={`calc(${$xGet(d)}${units} + ${d.dx || 0}%)`}
			style:top={`calc(${$yGet(d)}${units} + ${d.dy || 0}%)`}
			style:width={d.width}
		>
			<div class="layercake-annotation">
				<div><pre>{getText(d)}</pre></div>
			</div>
		</div>
	{/each}
</div>

<style>
	/* Mirrors Draggable.svelte CSS exactly */
	.static-wrapper {
		position: absolute;
		display: inline-block;
		box-sizing: border-box;
		transition: border-color 250ms;
		border-radius: 2px;
		padding: 3px;
		border: 1px solid transparent;
	}
	/* Mirrors AnnotationEditor.svelte CSS exactly */
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
	/* Mirrors EditableText.svelte CSS exactly */
	pre {
		margin: 0;
		padding: 0;
		font-family: unset;
		white-space: normal;
		pointer-events: none;
	}
</style>
