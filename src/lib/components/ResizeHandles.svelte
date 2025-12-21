<!--
  @component
  Horizontal resize handles for annotation text boxes.
  Supports west (left) and east (right) resizing only.
-->
<script>
	import { getContext } from 'svelte';

	let {
		/** Which handles to show: 'west', 'east', or both */
		grabbers = ['west', 'east'],
		/** Current width in pixels (bound) - number or "Npx" string */
		width = $bindable(),
		/** Callback when resizing */
		ondrag,
		/** Container selector for position calculations */
		containerClass = '.chart-container'
	} = $props();

	/** Parse width to number */
	function parseWidth(w) {
		if (typeof w === 'number') return w;
		if (typeof w === 'string') return parseInt(w) || 0;
		return 0;
	}

	const { padding } = getContext('LayerCake');

	let active = $state(null);
	let initialRect = $state(null);
	let initialPos = $state(null);

	function onmousedown(event) {
		event.stopPropagation();
		active = event.target;
		const rect = active.parentElement.getBoundingClientRect();
		initialRect = {
			width: rect.width,
			left: rect.left,
			top: rect.top
		};
		initialPos = { x: event.pageX };
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

		window.removeEventListener('mousemove', onmousemove);
		window.removeEventListener('mouseup', onmouseup);
	}

	function onmousemove(event) {
		if (!active) return;

		const isEast = active.classList.contains('east');
		const isWest = active.classList.contains('west');

		if (isEast) {
			const delta = event.pageX - initialPos.x;
			const newWidth = Math.round(initialRect.width + delta);
			if (newWidth < 50) return;
			width = `${newWidth}px`;
			ondrag();
		}

		if (isWest) {
			const delta = initialPos.x - event.pageX;
			const newWidth = Math.round(initialRect.width + delta);
			if (newWidth < 50) return;

			width = `${newWidth}px`;

			// Calculate new position - the left edge moves with the mouse
			const parent = active.parentElement.closest(containerClass)?.getBoundingClientRect();
			if (parent) {
				const newLeft = event.pageX - parent.left - $padding.left;
				const newTop = initialRect.top - parent.top - $padding.top;
				ondrag([newLeft, newTop]);
			} else {
				ondrag();
			}
		}
		}

	/** Keyboard resize handler */
	function onResize(delta) {
		const currentWidth = parseWidth(width);
		const newWidth = Math.max(50, currentWidth + delta);
		width = `${newWidth}px`;
		ondrag();
	}
</script>

{#each grabbers as grabber}
	<div
		class="grabber {grabber}"
		{onmousedown}
		onkeydown={(e) => {
			if (e.key === 'ArrowLeft') { onResize(-10); e.preventDefault(); }
			if (e.key === 'ArrowRight') { onResize(10); e.preventDefault(); }
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
