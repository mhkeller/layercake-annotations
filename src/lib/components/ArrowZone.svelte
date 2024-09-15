<script>
	import { getContext } from 'svelte';

	import invertScale from '$lib/modules/invertScale.js';

	const { xScale, yScale, percentRange, padding } = getContext('LayerCake');

	let { d, anchor, noteDimensions, containerClass = '.chart-container' } = $props();

	const hovering = getContext('hovering');
	const addArrow = getContext('addArrow');
	const modifyArrow = getContext('modifyArrow');

	/**
	 * Constants
	 */
	const diameterPx = 15;
	const handleOffsetPx = 18;

	/**
	 * State variables
	 */
	let el = $state();
	let leftDragged = $state('');
	let topDragged = $state('');
	let moving = $state(false);
	let units = $derived($percentRange === true ? '%' : 'px');
	let clockwise = $state(anchor.includes('left') ? false : true);

	let hasArrow = $derived(d.arrows.some((a) => a.source.anchor === anchor));

	/**
	 * Derive our initial left position
	 */
	let left = $derived.by(() => {
		const val = anchor.includes('left')
			? d.coords[0] - handleOffsetPx
			: anchor.includes('right')
				? d.coords[0] + noteDimensions[0] + handleOffsetPx / 3
				: d.coords[0] + noteDimensions[0] / 2 - diameterPx / 2;

		const inverted = invertScale($xScale, val);

		return `calc(${$xScale(inverted[0])}${units} + ${inverted[1]}%)`;
	});

	/**
	 * Derive our initial top position
	 */
	let top = $derived.by(() => {
		const val = anchor.includes('top')
			? d.coords[1] - handleOffsetPx
			: anchor.includes('bottom')
				? d.coords[1] + noteDimensions[1] + handleOffsetPx - diameterPx + 1
				: d.coords[1] + noteDimensions[1] / 2 - diameterPx / 2;

		const inverted = invertScale($yScale, val);

		return `calc(${$yScale(inverted[0])}${units} + ${inverted[1]}%)`;
	});

	/**
	 * Modify the arrows swoopiness
	 */
	function onclick(e) {
		if (!e.metaKey) return;

		// Rotate the arrow style
		if (clockwise === false) {
			clockwise = true;
		} else if (clockwise === true) {
			clockwise = null;
		} else {
			clockwise = false;
		}

		modifyArrow(d.id, { anchor, clockwise });
	}

	/**
	 * Drag the arrow zone
	 */
	function onmousemove(e) {
		if (moving) {
			const rect = el.getBoundingClientRect();
			const parent = el.closest(containerClass).getBoundingClientRect();

			const x = rect.left - $padding.left - parent.left + rect.width / 2 + e.movementX;
			const y = rect.top - $padding.top - parent.top + rect.height / 2 + e.movementY;

			const [xVal, yVal] = addArrow(d.id, { anchor, x, y, clockwise });

			leftDragged = `calc(${$xScale(xVal[0])}${units} + ${xVal[1]}% - ${rect.width / 2}px)`;
			topDragged = `calc(${$yScale(yVal[0])}${units} + ${yVal[1]}% - ${rect.height / 2}px)`;
		}
	}

	function onmousedown() {
		moving = true;
	}
	function onmouseup() {
		moving = false;
	}
	function onmouseover() {
		hovering.value = `${d.id}_${anchor}`;
	}
	function onmouseout() {
		hovering.value = '';
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
	class:hovering={hovering.value.split('_')[0] === String(d.id)}
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
		position: absolute;
		width: 21px;
		height: 23px;
		top: -5px;
		left: -3.5px;
		/* background: #ffcc0050; */
	}
	.hovering.arrow-zone {
		opacity: 1;
	}
</style>
