<script>
	import { Svg, Html } from 'layercake';
	import { getContext, setContext } from 'svelte';

	import AnnotationWrapper from '$lib/components/AnnotationWrapper.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';
	import invertScale from './modules/invertScale.js';
	import createRef from './modules/createRef.svelte.js';

	const { width, height, xScale, yScale, config } = getContext('LayerCake');

	let { containerClass, annotationClass } = $props();

	let annotations = $state([]);

	let isEditing = createRef(false);
	let noteCoords = createRef([0, 0]);

	setContext('isEditing', isEditing);
	setContext('noteCoords', noteCoords);

	function onclick(e) {
		if (isEditing.value === true) return;

		noteCoords.value = [e.offsetX, e.offsetY];

		const xVal = invertScale($xScale, e.offsetX);
		const yVal = invertScale($yScale, e.offsetY);
		console.log('onclick offset', e.offsetX, e.offsetY, xVal);
		console.log('onclick client', e.clientX, e.clientY, yVal);

		const id = annotations.length;
		const note = {
			id,
			[$config.x]: xVal[0],
			[$config.y]: yVal[0],
			dx: xVal[1],
			dy: yVal[1],
			text: 'Enter your note here...',
			arrows: []
		};
		annotations.push(note);
	}

	/**
	 * @param {Number} id - The id of the annotation being dragged.
	 * @param {Object} { x, y } - The x and y movement of the annotation.
	 * @returns {void}
	 */
	function ondrag(id, { x = 0, y = 0, refresh = false }) {
		const i = annotations.findIndex((d) => d.id === id);
		// TODO, could be better to redo the scale inversion with a new position
		if (x) {
			annotations[i].dx += (x / $width) * 100;
		}
		if (y) {
			annotations[i].dy += (y / $height) * 100;
		}

		// Force an update to redraw, we do this when we resize the annotation
		if (refresh) {
			annotations[i] = { ...annotations[i] };
		}
	}

	function modifyArrow(id, { anchor, ...attrs }) {
		const note = annotations.find((d) => d.id === id);
		const arrow = note.arrows.find((d) => d.source.anchor === anchor);
		for (const key in attrs) {
			arrow[key] = attrs[key];
		}
	}

	function addArrow(id, { anchor, x, y, clockwise }) {
		const note = annotations.find((d) => d.id === id);

		const xVal = invertScale($xScale, x);
		const yVal = invertScale($yScale, y);

		const arrow = {
			clockwise,
			source: { anchor },
			target: {
				[$config.x]: xVal[0],
				[$config.y]: yVal[0]
				// dx: xVal[1],
				// dy: yVal[1]
			}
		};

		const existingArrow = note.arrows.find((d) => d.source.anchor === anchor);

		if (!existingArrow) {
			note.arrows.push(arrow);
		} else {
			existingArrow.target = arrow.target;
		}
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
	<div {onclick} class="note-listener"></div>

	<div class="layercake-annotations">
		{#each annotations as d}
			<AnnotationWrapper {d} {ondrag} {addArrow} {modifyArrow} />
		{/each}
	</div>
</Html>

<style>
	.note-listener {
		width: 100%;
		height: 100%;
	}
</style>
