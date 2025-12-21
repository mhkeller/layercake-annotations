<script>
	/** @typedef {import('./types.js').Annotation} Annotation */

	import { getContext, setContext } from 'svelte';
	import { Svg, Html } from 'layercake';
	import { debounce } from 'underscore';

	import AnnotationEditor from '$lib/components/AnnotationEditor.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';

	import createRef from './modules/createRef.svelte.js';
	import newAnnotation from './modules/newAnnotation.js';

	/** @type {{ annotations?: Annotation[], containerClass?: string }} */
	let { annotations: annos = $bindable([]), containerClass } = $props();

	/**
	 * LayerCake context
	 */
	const { xScale, yScale, config } = getContext('LayerCake');
	const saveAnnotationConfig = getContext('saveAnnotationConfig');

	/**
	 * Save the config if the user has provided that option
	 */
	const sacDb = debounce(saveAnnotationConfig, 1_000);
	function saveAnnotationConfig_debounced(annos) {
		if (saveAnnotationConfig) {
			sacDb(annos);
		}
	}

	/**
	 * State vars
	 */
	let idCounter = Math.max(...annos.map((d) => d.id), -1);
	let annotations = $state(annos);
	const isEditing = createRef(false);
	/**
	 * Hovering state - null or { annotationId, type: 'body'|'arrow', side?, handle? }
	 * @type {{ value: null | { annotationId: number, type: string, side?: string, handle?: string } }}
	 */
	const hovering = createRef(null);
	const moving = createRef(false);

	// Preview arrow shown during drag (before mouseup saves it)
	const previewArrow = createRef(null);

	setContext('isEditing', isEditing);
	setContext('hovering', hovering);
	setContext('moving', moving);
	setContext('previewArrow', previewArrow);

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
		saveAnnotationConfig_debounced(annotations);
	}

	/**
	 * Delete an annotation from the chart
	 */
	async function deleteAnnotation(id) {
		annotations = annotations.filter((d) => d.id !== id);
		saveAnnotationConfig_debounced(annotations);
	}

	/**
	 * Modify the annotation's coordinates on drag
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
		saveAnnotationConfig_debounced(annotations);
	}

	/**
	 * Set or update an arrow on an annotation
	 * Arrow structure: { side, clockwise, source: { dx, dy }, target: { [xKey], [yKey] } }
	 */
	function setArrow(id, arrow) {
		const annotation = annotations.find((d) => d.id === id);
		if (!annotation) return;

		const existingIndex = annotation.arrows.findIndex((a) => a.side === arrow.side);

		if (existingIndex >= 0) {
			annotation.arrows[existingIndex] = arrow;
		} else {
			annotation.arrows.push(arrow);
		}

		saveAnnotationConfig_debounced(annotations);
	}

	/**
	 * Modify an arrow's properties (e.g., clockwise)
	 */
	function modifyArrow(id, side, attrs) {
		const annotation = annotations.find((d) => d.id === id);
		if (!annotation) return;

		const arrow = annotation.arrows.find((a) => a.side === side);
		if (!arrow) return;

		Object.assign(arrow, attrs);
		saveAnnotationConfig_debounced(annotations);
	}

	/**
	 * Delete an arrow from an annotation
	 */
	function deleteArrow(id, side) {
		const annotation = annotations.find((d) => d.id === id);
		if (!annotation) return;

		const len = annotation.arrows.length;
		annotation.arrows = annotation.arrows.filter((a) => a.side !== side);

		// If we were hovering over an empty arrow zone, delete the annotation
		if (len === annotation.arrows.length) {
			deleteAnnotation(annotation.id);
		}
		saveAnnotationConfig_debounced(annotations);
	}

	/**
	 * If we press the delete key while hovering, delete the annotation or arrow
	 */
	function onkeydown(e) {
		const hover = hovering.value;
		if (!hover || isEditing.value === true) return;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			if (hover.type === 'body') {
				deleteAnnotation(hover.annotationId);
			} else if (hover.type === 'arrow' && hover.side) {
				deleteArrow(hover.annotationId, hover.side);
			}
			saveAnnotationConfig_debounced(annotations);
		}
	}

	/**
	 * Save our modifier functions to the context
	 */
	setContext('modifyAnnotation', modifyAnnotation);
	setContext('setArrow', setArrow);
	setContext('modifyArrow', modifyArrow);
</script>

{#snippet defs()}
	<ArrowheadMarker />
{/snippet}

<Svg {defs}>
	<Arrows {annotations} />
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
		cursor: copy;
	}
</style>
