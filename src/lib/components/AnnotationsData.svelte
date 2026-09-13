<!--
  @component
  Adds text annotations that get their x and y placement using the `xScale` and `yScale`.
 -->
<script>
	/** @typedef {import('../types.js').Annotation} Annotation */

	import { getLayerCakeContext } from 'layercake';
	import { annotationWidth, getAnchorPoint } from '$lib/modules/coordinates.js';

	const k = getLayerCakeContext();

	/** @type {{ annotations?: Annotation[], getText?: (d: Annotation) => string }} */
	let { annotations = $bindable([]), getText = (d) => d.text } = $props();
</script>

<div class="layercake-annotations">
	{#each annotations as d, i}
		{@const anchor = getAnchorPoint(d, k)}
		<!-- Wrapper mirrors Draggable structure -->
		<div
			class="static-wrapper"
			data-id={i}
			style:left={`${anchor.x}px`}
			style:top={`${anchor.y}px`}
			style:width={`${annotationWidth(d)}px`}
			style:translate={d.anchorX || d.anchorY
				? `-${d.anchorX || 0}% -${d.anchorY || 0}%`
				: undefined}
		>
			<div
				class="layercake-annotation {d.class || ''}"
				style={d.style}
				style:text-align={d.align || 'left'}
			>
				<pre>{getText(d)}</pre>
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
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
	pre {
		margin: 0;
		font-family: inherit;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>
