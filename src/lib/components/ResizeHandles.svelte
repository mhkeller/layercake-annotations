<!--
  @component
  Horizontal resize handles for annotation text boxes.
  Supports west (left) and east (right) resizing only.
  Reports the left edge and width the box should take. The parent stores them.
-->
<script>
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	import { drag } from '$lib/modules/drag.js';

	/** The narrowest a box can be made, in pixels. */
	const MIN_WIDTH = 50;

	/** How far one arrow key moves the east edge, in pixels. */
	const STEP = 10;

	/** @type {{ left: number, width: number, onresize: (box: { left: number, width: number }) => void }} */
	let {
		/** The box's left edge, in chart pixels */
		left,
		/** The box's width, in pixels */
		width,
		/** Runs on every move with the left edge and width the box should take, in chart pixels */
		onresize
	} = $props();

	const k = getLayerCakeContext();
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');

	/** @type {'west' | 'east' | null} - Which handle is being dragged */
	let active = $state(null);

	// Where the box's edges sat when the press landed. Every move is worked out
	// from these two. The parent stores a rounded width, so measuring from the
	// live props would let the edge that is meant to hold still creep.
	let startLeft = 0;
	let startRight = 0;

	/** @param {'west' | 'east'} side */
	function start(side) {
		active = side;
		startLeft = left;
		startRight = left + width;
	}

	function onend() {
		active = null;
	}

	// The dragged thing is the right edge, so the gap between it and the pointer
	// is kept and the edge doesn't jump on the first move. The left edge holds still.
	const dragEast = drag({
		moving,
		pointer: k.pointer,
		onstart() {
			start('east');
			return { x: startRight, y: 0 };
		},
		onmove(pos) {
			onresize({ left: startLeft, width: Math.max(MIN_WIDTH, pos.x - startLeft) });
		},
		onend
	});

	// The left edge sits exactly under the pointer: the drag starts from the
	// pointer's own x, so there is no gap to keep. The right edge holds still.
	const dragWest = drag({
		moving,
		pointer: k.pointer,
		onstart(e) {
			start('west');
			return { x: k.pointer(e)[0], y: 0 };
		},
		onmove(pos) {
			const newWidth = Math.max(MIN_WIDTH, startRight - pos.x);
			onresize({ left: startRight - newWidth, width: newWidth });
		},
		onend
	});

	/**
	 * Keyboard resize - moves the east edge, the left edge holds still
	 * @param {KeyboardEvent} e
	 */
	function onkeydown(e) {
		const delta = { ArrowLeft: -STEP, ArrowRight: STEP }[e.key];
		if (!delta) return;

		e.preventDefault();
		onresize({ left, width: Math.max(MIN_WIDTH, width + delta) });
	}
</script>

<div
	class="grabber west"
	class:selected={active === 'west'}
	{@attach dragWest}
	{onkeydown}
	role="slider"
	tabindex="0"
	aria-label="Resize handle - use arrow keys to adjust width"
	aria-valuenow={width}
></div>
<div
	class="grabber east"
	class:selected={active === 'east'}
	{@attach dragEast}
	{onkeydown}
	role="slider"
	tabindex="0"
	aria-label="Resize handle - use arrow keys to adjust width"
	aria-valuenow={width}
></div>

<style>
	.grabber {
		position: absolute;
		box-sizing: border-box;
		transition: opacity 250ms;
		opacity: 0;
		z-index: 9999;
		width: 3px;
		height: 70%;
		top: 50%;
		background: red;
		border-radius: 2px;
		cursor: col-resize;
		/* A touch drag resizes the box rather than scrolling the page */
		touch-action: none;
	}

	.grabber.west {
		left: -0.5px;
		transform: translateX(-50%) translateY(-50%);
	}

	.grabber.east {
		right: -0.5px;
		transform: translateX(50%) translateY(-50%);
	}

	.grabber.selected {
		opacity: 1;
	}
</style>
