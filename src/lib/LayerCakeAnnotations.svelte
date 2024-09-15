<script>
	import { getContext, setContext } from 'svelte';
	import { Svg, Html } from 'layercake';
	import { debounce } from 'underscore';

	import AnnotationEditor from '$lib/components/AnnotationEditor.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';

	import createRef from './modules/createRef.svelte.js';
	import invertScale from './modules/invertScale.js';
	import newAnnotation from './modules/newAnnotation.js';

	let { containerClass, annotationClass } = $props();

	/**
	 * LayerCake context
	 */
	const { xScale, yScale, config } = getContext('LayerCake');
	const saveConfig = getContext('saveConfig');

	/**
	 * State vars
	 */
	let idCounter = -1;
	let annotations = $state([]);
	const isEditing = createRef(false);
	const hovering = createRef('');
	const moving = createRef(false);
	setContext('isEditing', isEditing);
	setContext('hovering', hovering);
	setContext('moving', moving);

	/**
	 * Add a new annotation to the chart
	 */
	function onclick(e) {
		if (isEditing.value === true) return;

		const annotation = newAnnotation(e, ++idCounter, {
			xScale: $xScale,
			yScale: $yScale,
			config: $config
		});
		annotations.push(annotation);
	}

	/**
	 * Delete an annotation from the chart
	 */
	async function deleteAnnotation(id) {
		annotations = annotations.filter((d) => d.id !== id);
	}

	/**
	 * Modify the annotations coordinates on drag
	 */
	function modifyAnnotation(id, newProps) {
		annotations.forEach((d, i) => {
			if (d.id === id) {
				annotations[i] = {
					...d,
					...newProps
				};
			}
		});
	}

	/**
	 * Add an arrow to an annotation
	 * or modify the target of an existing one
	 */
	function addArrow(id, { anchor, x, y, clockwise }) {
		const xVal = invertScale($xScale, x);
		const yVal = invertScale($yScale, y);

		const arrow = {
			clockwise,
			source: { anchor },
			target: {
				[$config.x]: xVal[0],
				[$config.y]: yVal[0],
				dx: xVal[1],
				dy: yVal[1]
			}
		};

		const annotation = annotations.find((d) => d.id === id);

		const existingArrow = annotation.arrows.find((a) => a.source.anchor === anchor);

		if (!existingArrow) {
			annotation.arrows.push(arrow);
		} else {
			existingArrow.target = arrow.target;
		}

		return [xVal, yVal];
	}

	/**
	 * Modify an arrow's properties
	 * Used for changing the swoop style
	 */
	function modifyArrow(id, { anchor, ...attrs }) {
		const annotation = annotations.find((d) => d.id === id);

		const arrow = annotation.arrows.find((a) => a.source.anchor === anchor);
		if (!arrow) return;

		for (const key in attrs) {
			arrow[key] = attrs[key];
		}
	}

	/**
	 * Deleting an arrow from an annotation
	 */
	function deleteArrow(id, anchor) {
		const annotation = annotations.find((d) => d.id === id);

		const len = annotation.arrows.length;
		annotation.arrows = annotation.arrows.filter((a) => a.source.anchor !== anchor);

		// If we were hovering over an empty arrow zone, delete the annotation.
		if (len === annotation.arrows.length) {
			deleteAnnotation(annotation.id);
		}
	}

	/**
	 * If we press the delete key while hovering, delete the annotation.
	 */
	function onkeydown(e) {
		// Bail if we aren't hovering if we are editing
		if (!hovering.value || isEditing.value === true) return;

		const [idStr, item] = hovering.value.split('_');

		const id = +idStr;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (item === 'body') {
				deleteAnnotation(id);
			} else {
				deleteArrow(id, item);
			}
		}
	}

	/**
	 * Save our modifier functions to the context
	 */
	setContext('modifyAnnotation', modifyAnnotation);
	setContext('addArrow', addArrow);
	setContext('modifyArrow', modifyArrow);

	/**
	 * Save the config if the user has provided that option
	 */
	const saveConfig_debounced = debounce(saveConfig, 1_000);
	$effect(() => {
		if (saveConfig) saveConfig_debounced(annotations);
	});
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
	<div onclick={debounce(onclick, 250, true)} class="note-listener"></div>

	<div class="layercake-annotations">
		{#each annotations as d (d.id)}
			<AnnotationEditor {d} {containerClass} />
		{/each}
	</div>
</Html>

<svelte:window {onkeydown} />

<style>
	.note-listener {
		width: 100%;
		height: 100%;
	}
</style>
