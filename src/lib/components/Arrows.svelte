<!--
  @component
  Renders SVG arrows for annotations. Source position is relative to annotation (pixel offsets),
  target position is in data space with optional percentage offsets for ordinal scales.
  During drag, uses live pixel coordinates from dragState.
 -->
<script>
	/** @typedef {import('../types.js').ResolvedAnnotation} ResolvedAnnotation */
	/** @typedef {import('../types.js').ResolvedArrow} ResolvedArrow */
	/** @typedef {import('../types.js').DragState} DragState */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	import { createArrowPath } from '../modules/arrowUtils.js';
	import { getArrowSource, getArrowTarget } from '../modules/coordinates.js';

	/** @type {{ annotations?: ResolvedAnnotation[], markerId: string }} */
	let { annotations = [], markerId } = $props();

	const k = getLayerCakeContext();

	/** @type {Ref<DragState | null> | undefined} - Only available in Editor mode */
	const dragStateRef = getContext('previewArrow');

	/**
	 * Compute the SVG path for a saved arrow
	 * @param {ResolvedAnnotation} anno
	 * @param {ResolvedArrow} arrow
	 */
	function getStaticPath(anno, arrow) {
		const source = getArrowSource(anno, arrow, k);
		const target = getArrowTarget(arrow, k);

		return createArrowPath(source, target, arrow.clockwise);
	}

	/**
	 * Check if a specific arrow is currently being dragged
	 */
	let draggingArrowKey = $derived.by(() => {
		if (!dragStateRef) return null;
		const ds = dragStateRef.value;
		if (!ds) return null;
		return `${ds.annotationId}_${ds.side}`;
	});

	/**
	 * Reactive drag path - renders arrow being dragged (new or existing)
	 */
	let dragPath = $derived.by(() => {
		// Static mode sets no preview context, so there is no ref there at all.
		const ds = dragStateRef?.value;
		if (!ds) return '';

		return createArrowPath(
			{ x: ds.sourceX, y: ds.sourceY },
			{ x: ds.targetX, y: ds.targetY },
			ds.clockwise
		);
	});
</script>

<g class="swoops">
	<!-- Render saved arrows (hide if this specific arrow is being dragged) -->
	{#each annotations as anno}
		{#each anno.arrows as arrow}
			{@const arrowKey = `${anno.id}_${arrow.side}`}
			{@const isBeingDragged = draggingArrowKey === arrowKey}
			{#if !isBeingDragged}
				{@const pathD = getStaticPath(anno, arrow)}
				<!-- Visible arrow -->
				<path class="arrow-visible" marker-end="url(#{markerId})" d={pathD}></path>
			{/if}
		{/each}
	{/each}

	<!-- Arrow being dragged (new or existing) - rendered with live coordinates -->
	{#if dragPath}
		<path class="arrow-visible" marker-end="url(#{markerId})" d={dragPath}></path>
	{/if}
</g>

<style>
	.arrow-visible {
		fill: none;
		stroke: #000;
		stroke-width: 1;
		pointer-events: none;
	}
</style>
