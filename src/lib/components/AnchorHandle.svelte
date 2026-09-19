<!--
  @component
  Diamond-shaped handle marking the annotation's anchor point — the spot that
  pins to the data point.

  Drag it to put the anchor anywhere in the box. Option-click the annotation to
  jump between the nine presets instead, or use the arrow keys to nudge it.
  Only shows in edit mode, while the annotation is hovered.
-->
<script>
	/** @typedef {import('../types.js').HoverState} HoverState */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';

	import { drag } from '$lib/modules/drag.js';

	/** How far one arrow key moves the anchor, in percentage points. */
	const STEP = 5;

	let {
		/** Annotation ID */
		id,
		/** Current anchor X position (0-100%) */
		anchorX,
		/** Current anchor Y position (0-100%) */
		anchorY,
		/** The annotation box, which the anchor is measured against */
		boxEl,
		/** Runs when a drag starts, so the parent can note where the annotation sat */
		onDragStart,
		/** Runs on every move with the new anchor position, as percentages of the box */
		onDrag,
		/** Runs when the drag finishes */
		onDragEnd
	} = $props();

	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');

	/** @type {HTMLDivElement|undefined} */
	let el = $state();
	let dragging = $state(false);
	let focused = $state(false);

	// Show it while the annotation is hovered, and hold it there for the whole
	// drag. The pointer leaves the box all the time on the way to a far corner.
	// Keyboard focus holds it too, so tabbing to it doesn't land on something that
	// isn't drawn.
	let visible = $derived(
		dragging || focused || (hovering.value?.annotationId === id && hovering.value?.type === 'body')
	);

	/**
	 * The box the anchor is measured against. Grabbed once when the drag starts:
	 * the box stays put while the anchor moves across it, so one measurement holds
	 * for the whole drag.
	 * @type {DOMRect|null}
	 */
	let boxRect = null;

	// Works in client pixels, the same space the box is measured in.
	const dragAnchor = drag({
		moving,
		onstart(event) {
			if (!boxEl || !el) return null;

			event.preventDefault();

			boxRect = boxEl.getBoundingClientRect();

			// The drag starts from where the diamond is actually drawn, not where the
			// box math says it should be. The two differ by the box's border.
			const diamond = el.getBoundingClientRect();

			// preventDefault above stops the browser focusing this, so do it by hand and
			// keep the arrow keys reachable. `focused` is what holds the diamond on
			// screen for someone who tabbed to it. A press shouldn't do the same, or the
			// diamond outlives the hover that put it there.
			el.focus();
			focused = false;

			dragging = true;
			onDragStart?.();

			return { x: diamond.left + diamond.width / 2, y: diamond.top + diamond.height / 2 };
		},
		onmove(pos) {
			if (!boxRect) return;
			onDrag?.(
				toPercent(pos.x - boxRect.left, boxRect.width),
				toPercent(pos.y - boxRect.top, boxRect.height)
			);
		},
		onend() {
			dragging = false;
			boxRect = null;
			onDragEnd?.();
		}
	});

	/**
	 * Where the pointer sits along one side of the box, as a percentage. Anything
	 * past an edge sticks to it.
	 * @param {number} offset
	 * @param {number} size
	 */
	function toPercent(offset, size) {
		if (!size) return 0;
		const pct = Math.min(100, Math.max(0, (offset / size) * 100));
		// Two decimals is finer than a pixel on any real annotation, and keeps the
		// config readable for anyone copying it into a chart.
		return Math.round(pct * 100) / 100;
	}

	/** @param {KeyboardEvent} event */
	function onkeydown(event) {
		const nudge = {
			ArrowLeft: [-STEP, 0],
			ArrowRight: [STEP, 0],
			ArrowUp: [0, -STEP],
			ArrowDown: [0, STEP]
		}[event.key];
		if (!nudge) return;

		// The arrow keys would otherwise scroll the page.
		event.preventDefault();

		onDragStart?.();
		onDrag?.(
			Math.min(100, Math.max(0, anchorX + nudge[0])),
			Math.min(100, Math.max(0, anchorY + nudge[1]))
		);
		onDragEnd?.();
	}
</script>

{#if visible}
	<div
		bind:this={el}
		class="anchor-indicator"
		class:dragging
		style:left="{anchorX}%"
		style:top="{anchorY}%"
		{@attach dragAnchor}
		{onkeydown}
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		role="slider"
		tabindex="0"
		aria-label="Anchor point - drag or use arrow keys to reposition"
		aria-valuenow={anchorX}
	></div>
{/if}

<style>
	.anchor-indicator {
		position: absolute;
		width: 10px;
		height: 10px;
		background: #007bff;
		transform: translate(-50%, -50%) rotate(45deg);
		z-index: 10000;
		opacity: 0.8;
		cursor: grab;
		/* A touch drag moves the anchor rather than scrolling the page */
		touch-action: none;
	}
	.anchor-indicator.dragging {
		opacity: 1;
		cursor: grabbing;
	}
</style>
