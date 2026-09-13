<!--
  @component
  Horizontal resize handles for annotation text boxes.
  Supports west (left) and east (right) resizing only.
-->
<script>
	import { onDestroy } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	import { annotationWidth } from '$lib/modules/coordinates.js';

	let {
		/** Which handles to show: 'west', 'east', or both */
		grabbers = ['west', 'east'],
		/** Current width in pixels (bound) - number or "Npx" string */
		width = $bindable(),
		/** Callback when resizing */
		ondrag,
		/** Anchor X position (0-100%) for resize compensation */
		anchorX = 0
	} = $props();

	const k = getLayerCakeContext();

	let active = $state(null);
	let isEast = false;
	let initialRect = $state(null);
	let initialPos = $state(null);

	function onmousedown(event) {
		event.stopPropagation();
		active = event.target;
		isEast = active.classList.contains('east');
		const rect = active.parentElement.getBoundingClientRect();
		const [pointerX] = k.pointer(event);
		initialRect = {
			width: rect.width,
			// Chart space, off the same event as the pointer, so a scroll can't pull them apart.
			left: pointerX - (event.clientX - rect.left)
		};
		initialPos = { x: pointerX };
		active.classList.add('selected');

		window.addEventListener('mousemove', onmousemove);
		window.addEventListener('mouseup', onmouseup);
	}

	function onmouseup() {
		if (!active) return;

		active.classList.remove('selected');
		active = null;
		initialRect = null;
		initialPos = null;

		stopListening();
	}

	function stopListening() {
		window.removeEventListener('mousemove', onmousemove);
		window.removeEventListener('mouseup', onmouseup);
	}

	// Deleting an annotation mid-resize takes this component with it, so drop the
	// window listeners on the way out rather than leaving them running.
	onDestroy(stopListening);

	function onmousemove(event) {
		if (!active) return;

		const [pointerX] = k.pointer(event);
		// Nothing to measure against before the chart mounts.
		if (!Number.isFinite(pointerX) || !Number.isFinite(initialPos.x)) {
			ondrag();
			return;
		}

		if (isEast) {
			const delta = pointerX - initialPos.x;
			const newWidth = Math.round(initialRect.width + delta);
			if (newWidth < 50) return;
			width = `${newWidth}px`;

			// Nudge the anchor right as the box grows so its left edge stays put. Only x moves.
			if (anchorX > 0) {
				const currentAnchorX = initialRect.left + (anchorX / 100) * initialRect.width;
				const newAnchorX = currentAnchorX + (anchorX / 100) * delta;
				ondrag([newAnchorX, null]);
			} else {
				ondrag();
			}
		}

		if (!isEast) {
			const delta = initialPos.x - pointerX;
			const newWidth = Math.round(initialRect.width + delta);
			if (newWidth < 50) return;

			width = `${newWidth}px`;

			// The left edge follows the pointer; the anchor rides at its share of the width. Only x moves.
			const newAnchorX = pointerX + (anchorX / 100) * newWidth;
			ondrag([newAnchorX, null]);
		}
	}

	/** Keyboard resize handler - resizes from east edge */
	function onResize(delta) {
		const currentWidth = annotationWidth({ width });
		const newWidth = Math.max(50, currentWidth + delta);
		width = `${newWidth}px`;
		// The anchor doesn't shift to keep up, the way it does on a mouse drag:
		// a keypress carries no pointer position to convert.
		ondrag();
	}
</script>

{#each grabbers as grabber}
	<div
		class="grabber {grabber}"
		{onmousedown}
		onkeydown={(e) => {
			if (e.key === 'ArrowLeft') {
				onResize(-10);
				e.preventDefault();
			}
			if (e.key === 'ArrowRight') {
				onResize(10);
				e.preventDefault();
			}
		}}
		role="slider"
		tabindex="0"
		aria-label="Resize handle - use arrow keys to adjust width"
		aria-valuenow={width}
	></div>
{/each}

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
