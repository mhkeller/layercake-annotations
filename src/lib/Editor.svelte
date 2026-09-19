<script>
	/** @typedef {import('./types.js').Annotation} Annotation */
	/** @typedef {import('./types.js').Arrow} Arrow */
	/** @typedef {import('./types.js').HoverState} HoverState */
	/** @typedef {import('./types.js').DragState} DragState */
	/** @typedef {import('./types.js').SaveAnnotationConfigFn} SaveAnnotationConfigFn */
	/**
	 * @template T
	 * @typedef {import('./types.js').Ref<T>} Ref
	 */

	import { getContext, setContext, onDestroy, onMount } from 'svelte';
	import { Svg, Html, getLayerCakeContext } from 'layercake';

	import AnnotationEditor from '$lib/components/AnnotationEditor.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';

	import debounce from './modules/debounce.js';
	import createRef from './modules/createRef.svelte.js';
	import newAnnotation from './modules/newAnnotation.js';
	import { dataKeys, resolveAnnotation } from './modules/coordinates.js';

	const markerId = $props.id();

	/** @type {{ annotations?: Annotation[], onsave?: SaveAnnotationConfigFn }} */
	let { annotations: annos = $bindable([]), onsave } = $props();

	/**
	 * LayerCake context
	 */
	const k = getLayerCakeContext();

	// A position is stored in `data` under the chart's x and y keys, so edit mode
	// needs accessors that are keys. The chart still draws without them.
	onMount(() => {
		if (dataKeys(k) === null) {
			console.error(
				'[layercake-annotations] Edit mode needs key accessors, like x="date" and y="value". A function or an array of keys gives a position nowhere to be stored, so annotations can\'t be added or moved.'
			);
		}
	});

	// Every default filled in, once, for everything below that draws or edits.
	// Writes go the other way: by id, into `annos`.
	let resolved = $derived(annos.map(resolveAnnotation));

	/** @type {SaveAnnotationConfigFn | undefined} */
	const saveFromContext = getContext('saveAnnotationConfig');

	/**
	 * Log the config for easy copy-paste
	 * @type {SaveAnnotationConfigFn}
	 */
	function logConfig(annotations) {
		console.log('Annotations config:', JSON.stringify(annotations, null, 2));
	}

	/**
	 * Save the config: to `onsave`, or to the `saveAnnotationConfig` context, or to
	 * the console. It reads the annotations when it fires and hands over a plain copy.
	 */
	const save = debounce(
		() => (onsave ?? saveFromContext ?? logConfig)($state.snapshot(annos)),
		1_000
	);

	/**
	 * State vars
	 */
	/** @type {Ref<number | null>} - The id of the note whose text is being edited */
	const editing = createRef(null);

	/** @type {Ref<HoverState | null>} */
	const hovering = createRef(null);

	/** @type {Ref<boolean>} */
	const moving = createRef(false);

	/** @type {Ref<DragState | null>} - Preview arrow shown during drag */
	const previewArrow = createRef(null);

	setContext('editing', editing);
	setContext('hovering', hovering);
	setContext('moving', moving);
	setContext('previewArrow', previewArrow);

	/**
	 * Add a new annotation at a position in the chart area, in pixels
	 */
	function addAnnotation(x, y) {
		// The next id up from the ones in the array right now.
		const ids = annos.map((d) => d.id).filter(Number.isFinite);
		const annotation = newAnnotation(x, y, Math.max(-1, ...ids) + 1, k);
		if (annotation === null) return;

		annos.push(annotation);
		save();
	}

	// Whether the press behind a click also ended a text edit. That click has done
	// its job, so it adds nothing.
	let endedEdit = false;

	function onListenerPointerdown() {
		// pointerdown comes before the blur that ends the edit.
		endedEdit = editing.value !== null;
	}

	/** @param {MouseEvent} e */
	function onListenerClick(e) {
		const skip = endedEdit;
		endedEdit = false;

		// One click makes one annotation. `detail` counts the clicks in a row. When
		// the first click of a double click ended an edit, the second one still lands
		// here, and it is passed over.
		if (skip || e.detail > 1) return;

		addAnnotation(e.offsetX, e.offsetY);
	}

	/** @param {KeyboardEvent} e */
	function onListenerKeydown(e) {
		if (e.key === 'Enter' && !e.repeat) addAnnotation(k.width / 2, k.height / 2);
	}

	// Annotations.svelte swaps this component out when `editable` goes false, so
	// let a save that's already waiting land instead of losing it.
	onDestroy(() => {
		save.flush();
	});

	/**
	 * Delete an annotation from the chart
	 */
	function deleteAnnotation(id) {
		// Reassign annos (the bindable prop) so deletion propagates to parent
		annos = annos.filter((d) => d.id !== id);
		save();
	}

	/**
	 * Merge new props into an annotation, by id. Every write to a note comes through here.
	 */
	function modifyAnnotation(id, newProps) {
		const i = annos.findIndex((d) => d.id === id);
		if (i === -1) return;

		annos[i] = { ...annos[i], ...newProps };
		save();
	}

	/**
	 * Replace an annotation's arrows with what `fn` makes of them. Every arrow
	 * write comes through here.
	 * @param {number} id
	 * @param {(arrows: Arrow[]) => Arrow[]} fn
	 */
	function updateArrows(id, fn) {
		const annotation = annos.find((d) => d.id === id);
		if (!annotation) return;

		modifyAnnotation(id, { arrows: fn(annotation.arrows ?? []) });
	}

	/**
	 * Set or update an arrow on an annotation
	 * Arrow structure: { side, clockwise, source: { dx, dy }, target: { data, dx, dy } }
	 */
	function setArrow(id, arrow) {
		// Replace the arrow on that side where it sits, so the order holds. Add it if there isn't one.
		updateArrows(id, (arrows) =>
			arrows.some((a) => a.side === arrow.side)
				? arrows.map((a) => (a.side === arrow.side ? arrow : a))
				: [...arrows, arrow]
		);
	}

	/**
	 * Modify an arrow's properties (e.g., clockwise)
	 */
	function modifyArrow(id, side, attrs) {
		updateArrows(id, (arrows) => arrows.map((a) => (a.side === side ? { ...a, ...attrs } : a)));
	}

	/**
	 * Delete an arrow from an annotation
	 */
	function deleteArrow(id, side) {
		updateArrows(id, (arrows) => arrows.filter((a) => a.side !== side));
	}

	/**
	 * Whether a key press lands in something that takes typing
	 * @param {EventTarget | undefined} target
	 */
	function takesTyping(target) {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
		);
	}

	/**
	 * If we press the delete key while hovering, delete the annotation or arrow
	 * @param {KeyboardEvent} e
	 */
	function onkeydown(e) {
		if (e.key !== 'Delete' && e.key !== 'Backspace') return;
		if (e.repeat) return;

		// The key belongs to whatever is being typed into, anywhere on the page. The
		// first entry of the composed path is the real target, even inside a shadow root.
		if (takesTyping(e.composedPath()[0])) return;

		const hover = hovering.value;
		if (!hover || !annos.some((d) => d.id === hover.annotationId)) return;

		if (hover.type === 'body') {
			deleteAnnotation(hover.annotationId);
		} else if (hover.type === 'arrow' && (hover.handle === 'source' || hover.handle === 'target')) {
			deleteArrow(hover.annotationId, hover.side);
		} else {
			// The handle that starts a new arrow has nothing to delete.
			return;
		}

		// What was hovered is gone. Whatever sits under the pointer in its place
		// counts as hovered once the pointer moves onto it or focus reaches it.
		hovering.value = null;
	}

	/**
	 * Save our modifier functions to the context
	 */
	setContext('modifyAnnotation', modifyAnnotation);
	setContext('setArrow', setArrow);
	setContext('modifyArrow', modifyArrow);
</script>

{#snippet defs()}
	<ArrowheadMarker {markerId} />
{/snippet}

<Svg {defs}>
	<Arrows annotations={resolved} {markerId} />
</Svg>

<Html>
	<!-- A click lands where the pointer is, Enter puts the note in the middle of the chart. -->
	<div
		onpointerdown={onListenerPointerdown}
		onclick={onListenerClick}
		onkeydown={onListenerKeydown}
		role="button"
		tabindex="0"
		aria-label="Click to add annotation"
		class="note-listener"
	></div>

	<div class="layercake-annotations">
		{#each resolved as d (d.id)}
			<AnnotationEditor {d} />
		{/each}
	</div>
</Html>

<svelte:window {onkeydown} />

<style>
	.note-listener {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		cursor: copy;
		outline: none;
		z-index: 0;
	}
	.layercake-annotations {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 1;
		pointer-events: none;
	}
	.layercake-annotations :global(.draggable),
	.layercake-annotations :global(.arrow-zone) {
		pointer-events: auto;
	}
	.layercake-annotations :global(.draggable.hovering) {
		border-color: red;
	}
	.layercake-annotations :global(.draggable.canDrag) {
		user-select: none;
		cursor: move;
		/* A touch drag moves the note rather than scrolling the page */
		touch-action: none;
	}
	.layercake-annotations :global(.draggable.hovering .grabber) {
		opacity: 1;
	}
</style>
