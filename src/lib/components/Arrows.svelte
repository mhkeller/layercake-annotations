<!--
  @component
  Renders SVG arrows for annotations. Source position is relative to annotation (pixel offsets),
  target position is in data space with optional percentage offsets for ordinal scales.
  During drag, uses live pixel coordinates from dragState.
 -->
<script>
	/** @typedef {import('../types.js').Annotation} Annotation */
	/** @typedef {import('../types.js').DragState} DragState */
	/** @typedef {import('../types.js').ModifyArrowFn} ModifyArrowFn */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	import { createArrowPath } from '../modules/arrowUtils.js';
	import { getArrowSource, getArrowTarget } from '../modules/coordinates.js';

	/** @type {{ annotations?: Annotation[], markerId: string }} */
	let { annotations = [], markerId } = $props();

	const k = getLayerCakeContext();

	/** @type {Ref<DragState | null> | undefined} - Only available in Editor mode */
	const dragStateRef = getContext('previewArrow');

	/** @type {ModifyArrowFn | undefined} - Only available in Editor mode */

	/**
	 * Build scales object for coordinate utilities
	 */
	function getScales() {
		return {
			xScale: k.xScale,
			yScale: k.yScale,
			x: k.x,
			y: k.y,
			width: k.width,
			height: k.height
		};
	}

	/**
	 * Compute the SVG path for a saved arrow
	 */
	function getStaticPath(anno, arrow) {
		const scales = getScales();
		const source = getArrowSource(anno, arrow, scales);
		const target = getArrowTarget(arrow, scales);
		const clockwise = arrow.clockwise !== undefined ? arrow.clockwise : true;

		return createArrowPath(source, target, clockwise);
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
		if (!dragStateRef) return '';
		const ds = dragStateRef.value;
		if (!ds || ds.annotationId === null || ds.annotationId === undefined) return '';
		if (ds.sourceX == null || ds.targetX == null) return '';

		const clockwise = ds.clockwise !== undefined ? ds.clockwise : true;
		return createArrowPath(
			{ x: ds.sourceX, y: ds.sourceY },
			{ x: ds.targetX, y: ds.targetY },
			clockwise
		);
	});
</script>

		<g class="swoops">
	<!-- Render saved arrows (hide if this specific arrow is being dragged) -->
			{#each annotations as anno}
				{#if anno.arrows}
					{#each anno.arrows as arrow}
				{@const arrowKey = `${anno.id}_${arrow.side}`}
				{@const isBeingDragged = draggingArrowKey === arrowKey}
				{#if !isBeingDragged}
					{@const pathD = getStaticPath(anno, arrow)}
					<!-- Visible arrow -->
					<path class="arrow-visible" marker-end="url(#{markerId})" d={pathD}
					></path>
				{/if}
			{/each}
		{/if}
	{/each}

	<!-- Arrow being dragged (new or existing) - rendered with live coordinates -->
	{#if dragPath}
		<path class="arrow-visible" marker-end="url(#{markerId})" d={dragPath}
		></path>
	{/if}
</g>

<style>
	.swoops {
		position: absolute;
		max-width: 200px;
		line-height: 14px;
	}
	.arrow-visible {
		fill: none;
		stroke: #000;
		stroke-width: 1;
		pointer-events: none;
	}
</style>
