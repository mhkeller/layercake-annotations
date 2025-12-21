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
			const newWidth = initialRect.width + delta;
			if (newWidth < 50) return;
			width = `${newWidth}px`;
			ondrag();
		}

		if (isWest) {
			const delta = initialPos.x - event.pageX;
			const newWidth = initialRect.width + delta;
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
</script>

{#each grabbers as grabber}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="grabber {grabber}" {onmousedown}></div>
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
		transform: translateY(-50%);
		background: red;
		border-radius: 2px;
		cursor: col-resize;
	}

	.grabber.west {
		left: 0;
	}

	.grabber.east {
		right: 0;
	}

	.grabber.selected {
		opacity: 1;
	}
</style>
