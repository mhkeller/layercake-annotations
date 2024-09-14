<script>
	import { Svg, Html } from 'layercake';
	import { getContext, setContext } from 'svelte';
	import { debounce } from 'underscore';

	import AnnotationEditor from '$lib/components/AnnotationEditor.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';
	import invertScale from './modules/invertScale.js';
	import createRef from './modules/createRef.svelte.js';

	const { xScale, yScale, config } = getContext('LayerCake');

	let { containerClass, annotationClass } = $props();

	let annotations = $state([]);

	let isEditing = createRef(false);

	setContext('isEditing', isEditing);

	function onclick(e) {
		if (isEditing.value === true) return;

		const noteCoords = [e.offsetX, e.offsetY];

		console.log('initial coords', noteCoords);

		const xVal = invertScale($xScale, noteCoords[0]);
		const yVal = invertScale($yScale, noteCoords[1]);

		const id = annotations.length;
		const note = {
			id,
			[$config.x]: xVal[0],
			[$config.y]: yVal[0],
			dx: xVal[1],
			dy: yVal[1],
			text: 'Enter your note here...',
			arrows: [],
			noteCoords
		};
		annotations.push(note);
	}

	function deleteAnnotation(id) {
		annotations = annotations.filter((d) => d.id !== id);
	}
</script>

<Svg>
	<svelte:fragment slot="defs">
		<ArrowheadMarker />
	</svelte:fragment>
	<Arrows {annotations} {containerClass} {annotationClass} />
</Svg>

<Html>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div onclick={debounce(onclick, 200, true)} class="note-listener"></div>

	<div class="layercake-annotations">
		{#each annotations as _, i}
			<AnnotationEditor bind:d={annotations[i]} {deleteAnnotation} {containerClass} />
		{/each}
	</div>
</Html>

<style>
	.note-listener {
		width: 100%;
		height: 100%;
	}
</style>
