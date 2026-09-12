<!--
  @component
  Draggable zones for creating/editing arrows. Only supports "west" and "east" sides.
  - When no arrow exists: shows one handle at annotation edge to create arrow
  - When arrow exists: shows TWO handles - one at source, one at target
  Updates arrow position in real-time during drag.
-->
<script>
	/** @typedef {import('../types.js').HoverState} HoverState */
	/** @typedef {import('../types.js').DragState} DragState */
	/** @typedef {import('../types.js').SetArrowFn} SetArrowFn */
	/** @typedef {import('../types.js').ModifyArrowFn} ModifyArrowFn */
	/** @typedef {import('../types.js').ModifyAnnotationFn} ModifyAnnotationFn */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import invertScale from '$lib/modules/invertScale.js';
	import {
		getArrowSource,
		getArrowTarget,
		calculateSourceDx,
		calculateSourceDy,
		HANDLE_OFFSET_PX
	} from '$lib/modules/coordinates.js';

	const { xScale, yScale, x, y, config, width, height, percentRange } = getContext('LayerCake');

	let { d, side } = $props();

	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {SetArrowFn} */
	const setArrow = getContext('setArrow');
	/** @type {ModifyArrowFn} */
	const modifyArrow = getContext('modifyArrow');
	/** @type {ModifyAnnotationFn} */
	const modifyAnnotation = getContext('modifyAnnotation');
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');
	/** @type {Ref<DragState | null>} */
	const dragState = getContext('previewArrow');

	/** Handle diameter in pixels */
	const diameterPx = 15;

	/** State - which handle is being dragged */
	let draggingSource = $state(false);
	let draggingTarget = $state(false);
	let dragX = $state(null);
	let dragY = $state(null);

	/** Get the existing arrow for this side (if any) */
	let arrow = $derived(d.arrows?.find((a) => a.side === side));

	/** Default clockwise direction based on side (null = straight line, so don't use ??) */
	let clockwise = $derived(
		arrow?.clockwise !== undefined ? arrow.clockwise : side === 'west' ? false : true
	);

	/** Build scales object for coordinate utilities */
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

	/** Where an arrow would start if this side doesn't have one yet */
	let placeholderArrow = $derived({ side, source: undefined });

	/**
	 * Current source position in pixels. Same function the renderer uses, so the
	 * handle and the drawn arrow can't drift apart.
	 */
	let sourcePos = $derived(getArrowSource(d, arrow ?? placeholderArrow, getScales()));

	let sourceX = $derived(sourcePos.x);
	let sourceY = $derived(sourcePos.y);

	/** Current target position in pixels (when arrow exists) */
	let targetX = $derived.by(() => {
		if (!arrow) return sourceX + (side === 'west' ? -50 : 50);
		return getArrowTarget(arrow, getScales()).x;
	});

	let targetY = $derived.by(() => {
		if (!arrow) return sourceY;
		return getArrowTarget(arrow, getScales()).y;
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

		dragState.value = {
			annotationId: d.id,
			side,
			sourceX: draggingSource ? dragX : sourceX,
			sourceY: draggingSource ? dragY : sourceY,
			targetX: draggingTarget ? dragX : targetX,
			targetY: draggingTarget ? dragY : targetY,
			clockwise
		};
	}

	/** Toggle clockwise on cmd+click - cycle order depends on side */
	function onclick(e) {
		if (!e.metaKey || !arrow) return;

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

		modifyArrow(d.id, side, { clockwise: newClockwise });
	}

	/** Start dragging source handle */
	function onSourceMousedown() {
		moving.value = true;
		draggingSource = true;
		dragX = sourceX;
		dragY = sourceY;
		updateDragState();
	}

	/** Start dragging target handle (or create mode) */
	function onTargetMousedown() {
		moving.value = true;
		draggingTarget = true;
		dragX = arrow ? targetX : sourceX;
		dragY = arrow ? targetY : sourceY;
		updateDragState();
	}

	/** Track mouse during drag */
	function onmousemove(e) {
		if (!draggingSource && !draggingTarget) return;

		dragX += e.movementX;
		dragY += e.movementY;
		updateDragState();
	}

	/** On release, save the arrow */
	function onmouseup() {
		// Only process if we were actually dragging
		if (!draggingSource && !draggingTarget) return;

		const scales = getScales();

		if (draggingSource && dragX !== null && dragY !== null) {
			// Update source position using shared coordinate utils
			const newSourceDx = calculateSourceDx(dragX, d, side, scales);
			const newSourceDy = calculateSourceDy(dragY, d, scales);

			if (arrow) {
				modifyArrow(d.id, side, {
					source: { dx: newSourceDx, dy: newSourceDy }
				});
			} else {
				// Creating new arrow - need target too
				const [targetDataX, targetOffsetX] = invertScale($xScale, targetX, $width, $percentRange);
				const [targetDataY, targetOffsetY] = invertScale($yScale, targetY, $height, $percentRange);

				setArrow(d.id, {
					side,
					clockwise,
					source: { dx: newSourceDx, dy: newSourceDy },
					target: {
						data: {
							[$config.x]: targetDataX,
							[$config.y]: targetDataY
						},
						dx: targetOffsetX,
						dy: targetOffsetY
					}
				});
			}
		}

		if (draggingTarget && dragX !== null && dragY !== null) {
			// Update target position (convert to data space)
			const [targetDataX, targetOffsetX] = invertScale($xScale, dragX, $width, $percentRange);
			const [targetDataY, targetOffsetY] = invertScale($yScale, dragY, $height, $percentRange);

			setArrow(d.id, {
				side,
				clockwise,
				source: {
					dx: arrow?.source?.dx ?? (side === 'west' ? -HANDLE_OFFSET_PX : HANDLE_OFFSET_PX),
					dy: arrow?.source?.dy ?? 0
				},
				target: {
					data: {
						[$config.x]: targetDataX,
						[$config.y]: targetDataY
					},
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

	function onmouseover(handle) {
		if (moving.value) return;
		hovering.value = { annotationId: d.id, type: 'arrow', side, handle };
	}

	function onmouseout() {
		if (moving.value) return;
		hovering.value = null;
	}

	// Show handles when hovering over ANY part of this annotation (body, any arrow zone)
	let isAnnotationHovered = $derived(hovering.value?.annotationId === d.id);
	let isDragging = $derived(draggingSource || draggingTarget);
</script>

{#if arrow}
	<!-- Source handle (when arrow exists) -->
	<div
		onmousedown={onSourceMousedown}
		{onclick}
		onkeydown={(e) => e.key === 'Enter' && onclick(e)}
		onfocus={() => onmouseover('source')}
		onblur={onmouseout}
		onmouseover={() => onmouseover('source')}
		{onmouseout}
		role="button"
		tabindex="0"
		aria-label="Arrow source handle - Cmd+click to toggle curve direction"
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
		onkeydown={(e) => e.key === 'Enter' && onclick(e)}
		onfocus={() => onmouseover('target')}
		onblur={onmouseout}
		onmouseover={() => onmouseover('target')}
		{onmouseout}
		role="button"
		tabindex="0"
		aria-label="Arrow target handle - drag to move arrow endpoint"
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
		onfocus={() => onmouseover('create')}
		onblur={onmouseout}
		onmouseover={() => onmouseover('create')}
		{onmouseout}
		role="button"
		tabindex="0"
		aria-label="Drag to create arrow"
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
		background: rgba(0, 0, 0, 0.1);
		cursor: grab;
		opacity: 0;
		transition: opacity 250ms;
		z-index: 10;
	}
	/* Larger hit area for easier hovering */
	.arrow-zone:before {
		content: '';
		position: absolute;
		width: 21px;
		height: 23px;
		top: -5px;
		left: -3.5px;
	}
	.arrow-zone.visible,
	.arrow-zone.dragging {
		opacity: 1;
	}
	.arrow-zone.dragging {
		cursor: grabbing;
	}
</style>
