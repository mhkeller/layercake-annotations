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

	import { getContext } from 'svelte';

	import { createArrowPath } from '../modules/arrowUtils.js';
	import { getArrowSource, getArrowTarget } from '../modules/coordinates.js';

	/** @type {{ annotations?: Annotation[] }} */
	let { annotations = [] } = $props();

	const { xScale, yScale, x, y, width, height } = getContext('LayerCake');

	/** @type {import('../types.js').Ref<DragState | null> | undefined} - Only available in Editor mode */
	const dragStateRef = getContext('previewArrow');

	/** @type {ModifyArrowFn | undefined} - Only available in Editor mode */
	const modifyArrow = getContext('modifyArrow');

	/**
	 * Build scales object for coordinate utilities
	 */
	function getScales() {
		return {
			xScale: $xScale,
			yScale: $yScale,
			x: $x,
			y: $y,
			width: $width,
			height: $height
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
	 * Toggle clockwise on cmd+click - cycle order depends on side
	 */
	function handleArrowClick(e, anno, arrow) {
		if (!e.metaKey || !modifyArrow) return;

		const side = arrow.side;
		const clockwise =
			arrow.clockwise !== undefined ? arrow.clockwise : side === 'west' ? false : true;

		let newClockwise;
		if (side === 'east') {
			// East: clockwise → straight → counter-clockwise → clockwise
			if (clockwise === true) {
				newClockwise = null;
			} else if (clockwise === null) {
				newClockwise = false;
			} else {
				newClockwise = true;
			}
		} else {
			// West: counter-clockwise → straight → clockwise → counter-clockwise
			if (clockwise === false) {
				newClockwise = null;
			} else if (clockwise === null) {
				newClockwise = true;
			} else {
				newClockwise = false;
			}
		}

		modifyArrow(anno.id, side, { clockwise: newClockwise });
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
		// Use == null to allow annotationId of 0
		if (!ds || ds.annotationId == null) return '';
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
					<path class="arrow-visible" marker-end="url(#layercake-annotation-arrowhead)" d={pathD}
					></path>
					<!-- Invisible hit area for clicking (edit mode only) -->
					{#if modifyArrow}
						<path
							class="arrow-hitarea"
							d={pathD}
							onclick={(e) => handleArrowClick(e, anno, arrow)}
							onkeydown={(e) => e.key === 'Enter' && handleArrowClick(e, anno, arrow)}
							role="button"
							tabindex="0"
							aria-label="Arrow - Cmd+Enter to toggle curve direction"
						></path>
					{/if}
				{/if}
			{/each}
		{/if}
	{/each}

	<!-- Arrow being dragged (new or existing) - rendered with live coordinates -->
	{#if dragPath}
		<path class="arrow-visible" marker-end="url(#layercake-annotation-arrowhead)" d={dragPath}
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
	.arrow-hitarea {
		fill: none;
		stroke: transparent;
		stroke-width: 12;
		cursor: pointer;
		pointer-events: stroke;
	}
</style>
