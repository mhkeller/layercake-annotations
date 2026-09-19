<!--
  @component
  Draggable zones for creating/editing arrows. Only supports "west" and "east" sides.
  - When no arrow exists: shows one handle at annotation edge to create arrow
  - When arrow exists: shows TWO handles - one at source, one at target
  Updates arrow position in real-time during drag.
-->
<script>
	/** @typedef {import('../types.js').ResolvedAnnotation} ResolvedAnnotation */
	/** @typedef {import('../types.js').HoverState} HoverState */
	/** @typedef {import('../types.js').DragState} DragState */
	/** @typedef {import('../types.js').SetArrowFn} SetArrowFn */
	/** @typedef {import('../types.js').ModifyArrowFn} ModifyArrowFn */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import { getLayerCakeContext } from 'layercake';
	import {
		getAnchorPoint,
		getArrowSource,
		getArrowTarget,
		getBoxEdges,
		calculateSourceDx,
		calculateSourceDy,
		invertPoint,
		HANDLE_OFFSET_PX
	} from '$lib/modules/coordinates.js';
	import { hasCmdOrCtrl } from '$lib/modules/modifierKeys.js';
	import { drag } from '$lib/modules/drag.js';

	const k = getLayerCakeContext();

	/** @type {{ d: ResolvedAnnotation, side: 'west' | 'east', boxHeight?: number }} */
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
	let arrow = $derived(d.arrows.find((a) => a.side === side));

	/** The arrow's curve. A new arrow starts counter-clockwise on the west side and clockwise on the east. */
	let clockwise = $derived(arrow ? arrow.clockwise : side === 'west' ? false : true);

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
			y: anchor.y + boxHeight * (0.5 - d.anchorY / 100)
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

	/** Toggle clockwise on Cmd+click (Ctrl+click on Windows and Linux) - cycle order depends on side */
	function onclick(e) {
		if (!arrow || !(hasCmdOrCtrl(e) && !e.altKey)) return;

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

	// The source handle moves where an existing arrow leaves the box.
	const dragSource = drag({
		moving,
		pointer: k.pointer,
		onstart() {
			draggingSource = true;
			dragX = sourceX;
			dragY = sourceY;
			updateDragState();
			return { x: dragX, y: dragY };
		},
		onmove,
		onend
	});

	// The target handle and the create handle both move where the arrow points.
	// A new arrow's target starts out on the create handle itself.
	const dragTarget = drag({
		moving,
		pointer: k.pointer,
		onstart() {
			draggingTarget = true;
			dragX = arrow ? targetX : sourceX;
			dragY = arrow ? targetY : sourceY;
			updateDragState();
			return { x: dragX, y: dragY };
		},
		onmove,
		onend
	});

	/**
	 * Track the handle during a drag
	 * @param {{ x: number, y: number }} pos - Where the handle sits now, in chart pixels.
	 */
	function onmove(pos) {
		dragX = pos.x;
		dragY = pos.y;
		updateDragState();
	}

	/**
	 * The end of a drag. The drag state and the preview go first, so nothing the
	 * save does can leave them behind. The arrow is saved only after a real drag
	 * that ended in a release: a plain click on a handle leaves the arrows as they are.
	 * @param {{ moved: boolean, cancelled: boolean }} result
	 */
	function onend({ moved, cancelled }) {
		const wasSource = draggingSource;
		const x = dragX;
		const y = dragY;

		draggingSource = false;
		draggingTarget = false;
		dragX = null;
		dragY = null;
		dragState.value = null;

		if (!moved || cancelled) return;

		if (wasSource) {
			// Update source position using shared coordinate utils
			modifyArrow(d.id, side, {
				source: {
					dx: calculateSourceDx(x, d, side, k),
					dy: calculateSourceDy(y, d, k)
				}
			});
			return;
		}

		// Update target position (convert to data space)
		const target = invertPoint(x, y, k);
		if (target === null) return;

		setArrow(d.id, {
			side,
			clockwise,
			// A new arrow starts where its handle was sitting, which is not the
			// anchor, so store the offsets rather than leaning on the defaults.
			source: arrow
				? arrow.source
				: {
						dx: calculateSourceDx(sourceX, d, side, k),
						dy: calculateSourceDy(sourceY, d, k)
					},
			target
		});
	}

	// A handle is hovered once it has been pointed at: the mouse moved over it, or
	// focus reached it. A handle that appears under a mouse holding still, like the
	// one that takes a deleted arrow's place, has not been.
	/** @param {'source' | 'target' | 'create'} handle */
	function onpoint(handle) {
		if (moving.value) return;
		const hover = hovering.value;
		if (hover?.annotationId === d.id && hover.side === side && hover.handle === handle) return;
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
		{@attach dragSource}
		{onclick}
		onkeydown={(e) => e.key === 'Enter' && onclick(e)}
		onfocus={() => onpoint('source')}
		onblur={onmouseout}
		onmousemove={() => onpoint('source')}
		{onmouseout}
		role="button"
		tabindex="0"
		aria-label="Arrow source handle - Cmd+click (Ctrl+click on Windows and Linux) to toggle curve direction"
		class:visible={isAnnotationHovered || isDragging}
		class:dragging={draggingSource}
		class="arrow-zone source {side}"
		style:left="{sourceDisplayX - diameterPx / 2}px"
		style:top="{sourceDisplayY - diameterPx / 2}px"
	></div>

	<!-- Target handle (when arrow exists) -->
	<div
		{@attach dragTarget}
		{onclick}
		onkeydown={(e) => e.key === 'Enter' && onclick(e)}
		onfocus={() => onpoint('target')}
		onblur={onmouseout}
		onmousemove={() => onpoint('target')}
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
		{@attach dragTarget}
		onfocus={() => onpoint('create')}
		onblur={onmouseout}
		onmousemove={() => onpoint('create')}
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
		/* A touch drag moves the handle rather than scrolling the page */
		touch-action: none;
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
