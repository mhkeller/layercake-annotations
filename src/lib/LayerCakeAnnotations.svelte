<script>
	import { Svg, Html } from 'layercake';
	import { onMount, getContext } from 'svelte';

	import AnnotationsData from '$lib/components/AnnotationsData.html.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';
	import ordinalInvert from './modules/ordinalInvert.js';

	const { xScale, yScale, config } = getContext('LayerCake');

	let { containerClass, chartNoteClass } = $props();

	let el = $state();
	let annotations = $state([]);

	function invertScale(scale, pos) {
		return scale.invert ? [scale.invert(pos), 0] : ordinalInvert(scale, pos);
	}

	function clickHandler(e) {
		const xVal = invertScale($xScale, e.offsetX);
		const yVal = invertScale($yScale, e.offsetY);

		const id = annotations.length;
		const note = {
			id,
			[$config.x]: xVal[0],
			[$config.y]: yVal[0],
			dx: xVal[1],
			dy: yVal[1],
			text: 'Enter your note here...'
		};
		annotations.push(note);
	}

	onMount(() => {
		el.addEventListener('click', clickHandler);
		return () => {
			el.removeEventListener('click', clickHandler);
		};
	});
</script>

<Svg>
	<svelte:fragment slot="defs">
		<ArrowheadMarker />
	</svelte:fragment>
	<Arrows {annotations} {containerClass} {chartNoteClass} />
</Svg>

<Html>
	<div bind:this={el} class="note-listener"></div>
	<AnnotationsData {annotations} />
</Html>

<style>
	.note-listener {
		width: 100%;
		height: 100%;
		background-color: #00000020;
	}
</style>
