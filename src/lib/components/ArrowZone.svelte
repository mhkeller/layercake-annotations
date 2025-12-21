<!--
  @component
  Draggable zones for creating/editing arrows. Only supports "west" and "east" sides.
  - When no arrow exists: shows one handle at annotation edge to create arrow
  - When arrow exists: shows TWO handles - one at source, one at target
  - East arrows: source dx is relative to RIGHT edge (negative = towards center)
  - West arrows: source dx is relative to LEFT edge (negative = towards left)
  Updates arrow position in real-time during drag.
-->
<script>
	import { getContext } from 'svelte';
	import invertScale from '$lib/modules/invertScale.js';

	const { xScale, yScale, x, y, config, width, height } = getContext('LayerCake');

	let { d, side, noteDimensions } = $props();

	const hovering = getContext('hovering');
	const setArrow = getContext('setArrow');
	const modifyArrow = getContext('modifyArrow');
	const modifyAnnotation = getContext('modifyAnnotation');
	const moving = getContext('moving');
	const dragState = getContext('previewArrow'); // Reusing for drag state

	/**
	 * Constants
	 */
	const diameterPx = 15;
	const handleOffsetPx = 12;

	/**
	 * State - which handle is being dragged
	 */
	let draggingSource = $state(false);
	let draggingTarget = $state(false);
	let dragX = $state(null);
	let dragY = $state(null);

	/**
	 * Get the existing arrow for this side (if any)
	 */
	let arrow = $derived(d.arrows?.find((a) => a.side === side));

	/**
	 * Default clockwise direction based on side
	 */
	let clockwise = $derived(arrow?.clockwise ?? (side === 'west' ? false : true));

	/**
	 * Annotation TEXT BOX top-left position in pixels
	 */
	let annoOffsetX = $derived(((d.dx ?? 0) / 100) * $width);
	let annoOffsetY = $derived(((d.dy ?? 0) / 100) * $height);
	let annoLeftX = $derived($xScale($x(d)) + annoOffsetX);
	let annoTopY = $derived($yScale($y(d)) + annoOffsetY);

	/**
	 * Annotation width
	 */
	let annoWidth = $derived(d.width ? parseInt(d.width) : noteDimensions[0]);

	/**
	 * Default source position (at edge of annotation box)
	 * West: negative offset from left edge
	 * East: positive offset from right edge
	 */
	let defaultSourceDx = $derived(side === 'west' ? -handleOffsetPx : handleOffsetPx);
	let defaultSourceDy = $derived(noteDimensions[1] / 2);

	/**
	 * Current source position in pixels
	 * West: annoLeftX + dx (dx is typically negative)
	 * East: annoLeftX + annoWidth + dx (dx is typically positive)
	 */
	let sourceX = $derived.by(() => {
		const dx = arrow?.source?.dx ?? defaultSourceDx;
		if (side === 'east') {
			return annoLeftX + annoWidth + dx;
		}
		return annoLeftX + dx;
	});
	let sourceY = $derived(annoTopY + (arrow?.source?.dy ?? defaultSourceDy));

	/**
	 * Current target position in pixels (when arrow exists)
	 */
	let targetX = $derived.by(() => {
		if (!arrow) return sourceX + (side === 'west' ? -50 : 50);
		const baseX = $xScale($x(arrow.target));
		const offsetX = ((arrow.target?.dx ?? 0) / 100) * $width;
		return baseX + offsetX;
	});

	let targetY = $derived.by(() => {
		if (!arrow) return sourceY;
		const baseY = $yScale($y(arrow.target));
		const offsetY = ((arrow.target?.dy ?? 0) / 100) * $height;
		return baseY + offsetY;
	});

	/**
	 * Zone positions for display
	 */
	let sourceDisplayX = $derived(draggingSource ? dragX : sourceX);
	let sourceDisplayY = $derived(draggingSource ? dragY : sourceY);
	let targetDisplayX = $derived(draggingTarget ? dragX : targetX);
	let targetDisplayY = $derived(draggingTarget ? dragY : targetY);

	/**
	 * Update drag state for live arrow rendering
	 */
	function updateDragState() {
		if (!draggingSource && !draggingTarget) {
			dragState.value = null;
			return;
		}

		// Pass pixel coordinates for the arrow being dragged
		dragState.value = {
			annotationId: d.id,
			side,
			sourceX: draggingSource ? dragX : sourceX,
			sourceY: draggingSource ? dragY : sourceY,
			targetX: draggingTarget ? dragX : targetX,
			targetY: draggingTarget ? dragY : targetY,
			clockwise,
			annoWidth
		};
	}

	/**
	 * Toggle clockwise on cmd+click
	 */
	function onclick(e) {
		if (!e.metaKey || !arrow) return;

		let newClockwise;
		if (clockwise === false) {
			newClockwise = true;
		} else if (clockwise === true) {
			newClockwise = null;
		} else {
			newClockwise = false;
		}

		modifyArrow(d.id, side, { clockwise: newClockwise });
	}

	/**
	 * Start dragging source handle
	 */
	function onSourceMousedown() {
		moving.value = true;
		draggingSource = true;
		dragX = sourceX;
		dragY = sourceY;
		updateDragState();
	}

	/**
	 * Start dragging target handle (or create mode)
	 */
	function onTargetMousedown() {
		moving.value = true;
		draggingTarget = true;
		dragX = arrow ? targetX : sourceX;
		dragY = arrow ? targetY : sourceY;
		updateDragState();
	}

	/**
	 * Track mouse during drag
	 */
	function onmousemove(e) {
		if (!draggingSource && !draggingTarget) return;

		dragX += e.movementX;
		dragY += e.movementY;
		updateDragState();
	}

	/**
	 * Calculate source dx based on side
	 * West: offset from left edge (annoLeftX)
	 * East: offset from right edge (annoLeftX + annoWidth)
	 */
	function calculateSourceDx(pixelX) {
		if (side === 'east') {
			// dx is offset from right edge
			return pixelX - (annoLeftX + annoWidth);
		}
		// dx is offset from left edge
		return pixelX - annoLeftX;
	}

	/**
	 * On release, save the arrow
	 */
	function onmouseup() {
		// Always save annotation width to ensure consistent rendering
		const currentWidth = `${noteDimensions[0]}px`;
		if (d.width !== currentWidth) {
			modifyAnnotation(d.id, { width: currentWidth });
		}

		if (draggingSource && dragX !== null && dragY !== null) {
			// Update source position
			const newSourceDx = calculateSourceDx(dragX);
			const newSourceDy = dragY - annoTopY;

			if (arrow) {
				modifyArrow(d.id, side, {
					source: { dx: newSourceDx, dy: newSourceDy }
				});
			} else {
				// Creating new arrow - need target too
				const [targetDataX, targetOffsetX] = invertScale($xScale, targetX);
				const [targetDataY, targetOffsetY] = invertScale($yScale, targetY);

				setArrow(d.id, {
					side,
					clockwise,
					source: { dx: newSourceDx, dy: newSourceDy },
					target: {
						[$config.x]: targetDataX,
						[$config.y]: targetDataY,
						dx: targetOffsetX,
						dy: targetOffsetY
					}
				});
			}
		}

		if (draggingTarget && dragX !== null && dragY !== null) {
			// Update target position (convert to data space)
			const [targetDataX, targetOffsetX] = invertScale($xScale, dragX);
			const [targetDataY, targetOffsetY] = invertScale($yScale, dragY);

			// Calculate source dx based on side
			const existingSourceDx = arrow?.source?.dx ?? defaultSourceDx;

			setArrow(d.id, {
				side,
				clockwise,
				source: {
					dx: existingSourceDx,
					dy: arrow?.source?.dy ?? defaultSourceDy
				},
				target: {
					[$config.x]: targetDataX,
					[$config.y]: targetDataY,
					dx: targetOffsetX,
					dy: targetOffsetY
				}
			});
		}

		// Clear state
		moving.value = false;
		draggingSource = false;
		draggingTarget = false;
		dragX = null;
		dragY = null;
		dragState.value = null;
	}

	function onmouseover(type) {
		if (moving.value) return;
		hovering.value = `${d.id}_${side}_${type}`;
	}

	function onmouseout() {
		if (moving.value) return;
		hovering.value = '';
	}

	// Show handles when hovering over ANY part of this annotation (body, any arrow zone)
	let isAnnotationHovered = $derived(hovering.value.startsWith(`${d.id}_`));
	let isDragging = $derived(draggingSource || draggingTarget);
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

{#if arrow}
	<!-- Source handle (when arrow exists) -->
	<div
		onmousedown={onSourceMousedown}
		{onclick}
		onmouseover={() => onmouseover('source')}
		{onmouseout}
		class:visible={isAnnotationHovered || isDragging}
		class:dragging={draggingSource}
		class="arrow-zone source {side}"
		style:left="{sourceDisplayX - diameterPx / 2}px"
		style:top="{sourceDisplayY - diameterPx / 2}px"
	></div>

	<!-- Target handle (when arrow exists) -->
	<div
		onmousedown={onTargetMousedown}
		{onclick}
		onmouseover={() => onmouseover('target')}
		{onmouseout}
		class:visible={isAnnotationHovered || isDragging}
		class:dragging={draggingTarget}
		class="arrow-zone target {side}"
		style:left="{targetDisplayX - diameterPx / 2}px"
		style:top="{targetDisplayY - diameterPx / 2}px"
	></div>
{:else}
	<!-- Create handle (no arrow yet) - drag to create -->
	<div
		onmousedown={onTargetMousedown}
		onmouseover={() => onmouseover('create')}
		{onmouseout}
		class:visible={isAnnotationHovered || isDragging}
		class:dragging={draggingTarget}
		class="arrow-zone create {side}"
		style:left="{(draggingTarget ? dragX : sourceX) - diameterPx / 2}px"
		style:top="{(draggingTarget ? dragY : sourceY) - diameterPx / 2}px"
	></div>
{/if}

<svelte:window {onmouseup} {onmousemove} />

<style>
	.arrow-zone {
		--diameter: 15px;
		position: absolute;
		width: var(--diameter);
		height: var(--diameter);
		border-radius: 50%;
		border: 1px dashed #333;
		cursor: pointer;
		opacity: 0;
		transition: opacity 250ms;
		z-index: 10;
	}
	/* For better hovering */
	.arrow-zone:before {
		content: ' ';
		position: absolute;
		width: 21px;
		height: 23px;
		top: -5px;
		left: -3.5px;
	}
	.visible.arrow-zone,
	.dragging.arrow-zone {
		opacity: 1;
	}
	.arrow-zone {
		background: rgba(0, 0, 0, 0.1);
	}
</style>
