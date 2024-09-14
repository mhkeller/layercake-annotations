<script>
	import { getContext } from 'svelte';

	import invertScale from '$lib/modules/invertScale.js';

	const { xScale, yScale, percentRange } = getContext('LayerCake');

	let units = $derived($percentRange === true ? '%' : 'px');
	let { d, anchor, addArrow, modifyArrow, noteDimensions } = $props();

	const noteCoords = getContext('noteCoords');

	let clockwise = $state(anchor.includes('left') ? false : true);
	let moving = $state(false);
	let el = $state();
	function onmousedown() {
		moving = true;
	}

	const diameterPx = 15;
	const handleOffsetPx = 18;

	let leftVal = $derived.by(() => {
		return anchor.includes('left')
			? invertScale($xScale, noteCoords.value[0] - handleOffsetPx)
			: anchor.includes('right')
				? invertScale($xScale, noteCoords.value[0] + noteDimensions[0] + handleOffsetPx)
				: invertScale($xScale, noteCoords.value[0] + noteDimensions[0] / 2 - diameterPx / 2);
	});

	let topVal = $derived.by(() => {
		return anchor.includes('top')
			? invertScale($yScale, noteCoords.value[1] - handleOffsetPx)
			: anchor.includes('bottom')
				? invertScale(
						$yScale,
						noteCoords.value[1] + noteDimensions[1] + handleOffsetPx - diameterPx + 1
					)
				: invertScale($yScale, noteCoords.value[1] + noteDimensions[1] / 2 - diameterPx / 2);
	});
	let left = $derived(`calc(${$xScale(leftVal[0])}${units} + ${leftVal[1]}%)`);
	let top = $derived(`calc(${$yScale(topVal[0])}${units} + ${topVal[1]}%)`);

	function onmousemove(e) {
		if (moving) {
			// left += e.movementX;
			// top += e.movementY;

			const rect = el.getBoundingClientRect();
			const x = rect.left - handleOffsetPx - rect.width / 2;
			const y = rect.top - rect.height / 2;

			addArrow(d.id, { anchor, x, y, clockwise });
		}
	}

	function onmouseup() {
		moving = false;
	}

	function onclick(e) {
		if (!e.metaKey) return;
		clockwise = !clockwise;
		modifyArrow(d.id, { anchor, clockwise });
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={el} {onmousedown} {onclick} class="arrow-zone {anchor}" style:left style:top></div>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.arrow-zone {
		--diameter: 15px;
		position: absolute;
		width: var(--diameter);
		height: var(--diameter);
		border-radius: 50%;
		border: 1px dashed #333;
		--distance: 18px;
		cursor: pointer;
		/* opacity: 0; */
	}
</style>
