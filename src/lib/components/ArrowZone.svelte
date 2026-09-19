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
	import { getLayerCakeContext } from 'layercake';
	import invertScale from '$lib/modules/invertScale.js';
	import {
		getAnchorPoint,
		getArrowSource,
		getArrowTarget,
		getBoxEdges,
		calculateSourceDx,
		calculateSourceDy,
		resolveArrowSource,
		HANDLE_OFFSET_PX
	} from '$lib/modules/coordinates.js';

	const k = getLayerCakeContext();

	let { d, side, boxHeight = 0 } = $props();

	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {SetArrowFn} */
	const setArrow = getContext('setArrow');
	/** @type {ModifyArrowFn} */
	const modifyArrow = getContext('modifyArrow');
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

	/**
	 * Where a new arrow would leave from: the middle of the box's near edge. Not
	 * the anchor point, which would slide the handle around every time the anchor
	 * moved and read as the anchor dragging the arrows with it.
	 */
	function newArrowSource() {
		const anchor = getAnchorPoint(d, k);
		const { left, right } = getBoxEdges(d, k, anchor);
		return {
			x: side === 'east' ? right + HANDLE_OFFSET_PX : left - HANDLE_OFFSET_PX,
			y: anchor.y + boxHeight * (0.5 - (d.anchorY ?? 0) / 100)
		};
	}

	/**
	 * Current source position in pixels. An existing arrow goes through the same
	 * function the renderer uses, so the handle and the drawn arrow can't drift
	 * apart.
	 */
	let sourcePos = $derived(arrow ? getArrowSource(d, arrow, k) : newArrowSource());

	let sourceX = $derived(sourcePos.x);
	let sourceY = $derived(sourcePos.y);

	/** Current target position in pixels, or where a new arrow would point */
	let targetPos = $derived(arrow ? getArrowTarget(arrow, k) : null);
	let targetX = $derived(targetPos ? targetPos.x : sourceX + (side === 'west' ? -50 : 50));
	let targetY = $derived(targetPos ? targetPos.y : sourceY);

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

	/**
	 * Capture routes every later move and the release to the handle that started
	 * the drag, however far the pointer travels, and the browser hands it back when
	 * the drag ends.
	 * @param {PointerEvent & { currentTarget: Element }} e
	 */
	function capture(e) {
		e.currentTarget.setPointerCapture(e.pointerId);
	}

	/** Start dragging source handle */
	function onSourcePointerdown(e) {
		capture(e);
		moving.value = true;
		draggingSource = true;
		dragX = sourceX;
		dragY = sourceY;
		rememberGrab(e, sourceX, sourceY);
		updateDragState();
	}

	/** Start dragging target handle (or create mode) */
	function onTargetPointerdown(e) {
		capture(e);
		moving.value = true;
		draggingTarget = true;
		dragX = arrow ? targetX : sourceX;
		dragY = arrow ? targetY : sourceY;
		rememberGrab(e, dragX, dragY);
		updateDragState();
	}

	// Where the pointer sat relative to the handle when the drag started, so the
	// handle doesn't jump under the cursor on the first move.
	let grabX = 0;
	let grabY = 0;

	/** Track the pointer during a drag */
	function onpointermove(e) {
		if (!draggingSource && !draggingTarget) return;

		// Absolute, rather than summing movementX: that drifts under page zoom and
		// loses a frame's motion whenever the pointer leaves the window.
		const [px, py] = k.pointer(e);
		dragX = px - grabX;
		dragY = py - grabY;
		updateDragState();
	}

	/** @param {MouseEvent} e */
	function rememberGrab(e, x, y) {
		const [px, py] = k.pointer(e);
		grabX = px - x;
		grabY = py - y;
	}

	/** On release, save the arrow */
	function onpointerup() {
		// Only process if we were actually dragging
		if (!draggingSource && !draggingTarget) return;

		if (draggingSource && dragX !== null && dragY !== null) {
			// Update source position using shared coordinate utils
			const newSourceDx = calculateSourceDx(dragX, d, side, k);
			const newSourceDy = calculateSourceDy(dragY, d, k);

			if (arrow) {
				modifyArrow(d.id, side, {
					source: { dx: newSourceDx, dy: newSourceDy }
				});
			} else {
				// Creating new arrow - need target too
				const [targetDataX, targetOffsetX] = invertScale(
					k.xScale,
					targetX,
					k.width,
					k.percentRange
				);
				const [targetDataY, targetOffsetY] = invertScale(
					k.yScale,
					targetY,
					k.height,
					k.percentRange
				);

				setArrow(d.id, {
					side,
					clockwise,
					source: { dx: newSourceDx, dy: newSourceDy },
					target: {
						data: {
							[k.config.x]: targetDataX,
							[k.config.y]: targetDataY
						},
						dx: targetOffsetX,
						dy: targetOffsetY
					}
				});
			}
		}

		if (draggingTarget && dragX !== null && dragY !== null) {
			// Update target position (convert to data space)
			const [targetDataX, targetOffsetX] = invertScale(k.xScale, dragX, k.width, k.percentRange);
			const [targetDataY, targetOffsetY] = invertScale(k.yScale, dragY, k.height, k.percentRange);

			setArrow(d.id, {
				side,
				clockwise,
				// A new arrow starts where its handle was sitting, which is not the
				// anchor, so store the offsets rather than leaning on the defaults.
				source: arrow
					? resolveArrowSource(arrow)
					: {
							dx: calculateSourceDx(sourceX, d, side, k),
							dy: calculateSourceDy(sourceY, d, k)
						},
				target: {
					data: {
						[k.config.x]: targetDataX,
						[k.config.y]: targetDataY
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
		onpointerdown={onSourcePointerdown}
		{onpointermove}
		{onpointerup}
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
		onpointerdown={onTargetPointerdown}
		{onpointermove}
		{onpointerup}
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
		onpointerdown={onTargetPointerdown}
		{onpointermove}
		{onpointerup}
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
