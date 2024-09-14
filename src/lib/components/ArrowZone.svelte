<script>
	import { getContext } from 'svelte';

	import invertScale from '$lib/modules/invertScale.js';

	const { xScale, yScale, percentRange, padding } = getContext('LayerCake');

	let { d, anchor, addArrow, modifyArrow, noteDimensions } = $props();

	/**
	 * Constants
	 */
	const diameterPx = 15;
	const handleOffsetPx = 18;

	const PADDING = 3;
	const BORDER_WIDTH = 1;

	/**
	 * State variables
	 */
	let el = $state();
	let leftDragged = $state('');
	let topDragged = $state('');
	let moving = $state(false);
	let hasArrow = $state(false);
	let units = $derived($percentRange === true ? '%' : 'px');
	let clockwise = $state(anchor.includes('left') ? false : true);

	const hovering = getContext('hovering');

	/**
	 * Derive our initial left position
	 */
	let left = $derived.by(() => {
		const val = anchor.includes('left')
			? d.noteCoords[0] - handleOffsetPx
			: anchor.includes('right')
				? d.noteCoords[0] + noteDimensions[0] + handleOffsetPx / 3
				: d.noteCoords[0] + noteDimensions[0] / 2 - diameterPx / 2;

		const inverted = invertScale($xScale, val);

		return `calc(${$xScale(inverted[0])}${units} + ${inverted[1]}%)`;
	});

	/**
	 * Derive our initial top position
	 */
	let top = $derived.by(() => {
		const val = anchor.includes('top')
			? d.noteCoords[1] - handleOffsetPx
			: anchor.includes('bottom')
				? d.noteCoords[1] + noteDimensions[1] + handleOffsetPx - diameterPx + 1
				: d.noteCoords[1] + noteDimensions[1] / 2 - diameterPx / 2;

		const inverted = invertScale($yScale, val);

		return `calc(${$yScale(inverted[0])}${units} + ${inverted[1]}%)`;
	});

	function onclick(e) {
		if (!e.metaKey) return;
		clockwise = !clockwise;
		modifyArrow({ anchor, clockwise });
	}

	function onmousemove(e) {
		if (moving) {
			const rect = el.getBoundingClientRect();
			// const x = rect.left - rect.width / 2 + e.movementX;
			// const y = rect.top - rect.height + e.movementY;
			const cssPaddingBorder = PADDING * 2 + BORDER_WIDTH * 2;

			const x = rect.left - $padding.left - cssPaddingBorder + rect.width / 2 + e.movementX;
			const y = rect.top - $padding.top - cssPaddingBorder + rect.height / 2 + e.movementY;

			console.log(rect.left, rect.top);

			const [xVal, yVal] = addArrow({ anchor, x, y, clockwise });
			leftDragged = `calc(${$xScale(xVal[0])}${units} + ${xVal[1]}% - ${rect.width / 2}px)`;
			topDragged = `calc(${$yScale(yVal[0])}${units} + ${yVal[1]}% - ${rect.height / 2}px)`;

			hasArrow = true;
		}
	}

	function onmousedown() {
		moving = true;
	}

	function onmouseup() {
		moving = false;
	}

	function onmouseover() {
		hovering.value = true;
	}
	function onmouseout() {
		hovering.value = false;
	}
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
	bind:this={el}
	{onmousedown}
	{onclick}
	{onmouseover}
	{onmouseout}
	class:hovering={hovering.value}
	class="arrow-zone {anchor}"
	style:left={hasArrow ? leftDragged : left}
	style:top={hasArrow ? topDragged : top}
></div>

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
	}
	/* For better hovering */
	.arrow-zone:before {
		content: ' ';
		--diameter: 25px;
		position: absolute;
		width: var(--diameter);
		height: var(--diameter);
		top: -5px;
		left: -5px;
		/* background: #ffcc0050; */
		/* z-index: -1; */
		/* cursor: default; */
	}
	.hovering.arrow-zone {
		opacity: 1;
	}
</style>
