<!--
  @component
  Renders SVG arrows for annotations. Source position is relative to annotation (pixel offsets),
  target position is in data space with optional percentage offsets for ordinal scales.
  During drag, uses live pixel coordinates from dragState.
-->
<script>
	import { getContext } from 'svelte';
	import { swoopyArrow } from '../modules/arrowUtils.js';

	/** @type {Array} annotations - A list of annotation objects */
	let { annotations = [] } = $props();

	const { xScale, yScale, x, y, width, height } = getContext('LayerCake');

	// Get dragState ref from context
	const dragStateRef = getContext('previewArrow');

	/**
	 * Helper to generate swoopy arrow path
	 */
	function makePath(sourceX, sourceY, targetX, targetY, clockwise) {
		const sourceCoords = [sourceX, sourceY];
		const targetCoords = [targetX, targetY];

		// Create arrow path - straight line if clockwise is null
		if (clockwise === null) {
			return `M${sourceCoords.join(',')} L${targetCoords.join(',')}`;
		}

		return swoopyArrow()
			.angle(Math.PI / 2)
			.clockwise(clockwise)
			.x((q) => q[0])
			.y((q) => q[1])([sourceCoords, targetCoords]);
	}

	/**
	 * Compute the SVG path for a saved arrow
	 */
	function getStaticPath(anno, arrow) {
		// Use saved coordinates
		const annoOffsetX = ((anno.dx ?? 0) / 100) * $width;
		const annoOffsetY = ((anno.dy ?? 0) / 100) * $height;
		const annoLeftX = $xScale($x(anno)) + annoOffsetX;
		const annoTopY = $yScale($y(anno)) + annoOffsetY;

		// For east arrows, dx is relative to annotation width
		// Default matches typical annotation width (with padding)
		const annoWidth = anno.width ? parseInt(anno.width) : 155;
		let sourceX;
		if (arrow.side === 'east') {
			sourceX = annoLeftX + annoWidth + (arrow.source?.dx ?? 0);
		} else {
			sourceX = annoLeftX + (arrow.source?.dx ?? 0);
		}
		const sourceY = annoTopY + (arrow.source?.dy ?? 0);

		const targetX = $xScale($x(arrow.target)) + ((arrow.target?.dx ?? 0) / 100) * $width;
		const targetY = $yScale($y(arrow.target)) + ((arrow.target?.dy ?? 0) / 100) * $height;

		const cw = arrow.clockwise ?? true;
		return makePath(sourceX, sourceY, targetX, targetY, cw);
	}

	/**
	 * Check if a specific arrow is currently being dragged
	 */
	let draggingArrowKey = $derived.by(() => {
		const ds = dragStateRef.value;
		if (!ds) return null;
		return `${ds.annotationId}_${ds.side}`;
	});

	/**
	 * Reactive drag path - renders arrow being dragged (new or existing)
	 */
	let dragPath = $derived.by(() => {
		const ds = dragStateRef.value;
		// Use == null to allow annotationId of 0
		if (!ds || ds.annotationId == null) return '';
		if (ds.sourceX == null || ds.targetX == null) return '';

		const cw = ds.clockwise ?? true;
		return makePath(ds.sourceX, ds.sourceY, ds.targetX, ds.targetY, cw);
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
					<path marker-end="url(#layercake-annotation-arrowhead)" d={getStaticPath(anno, arrow)}></path>
				{/if}
			{/each}
		{/if}
	{/each}

	<!-- Arrow being dragged (new or existing) - rendered with live coordinates -->
	{#if dragPath}
		<path marker-end="url(#layercake-annotation-arrowhead)" d={dragPath}></path>
	{/if}
</g>

<style>
	.swoops {
		position: absolute;
		max-width: 200px;
		line-height: 14px;
	}
	.swoops path {
		fill: none;
		stroke: #000;
		stroke-width: 1;
	}
</style>
