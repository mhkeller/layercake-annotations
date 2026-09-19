<script>
	/** @typedef {import('../types.js').Annotation} Annotation */
	/** @typedef {import('../types.js').ModifyAnnotationFn} ModifyAnnotationFn */

	import { getContext } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';
	import AnchorHandle from './AnchorHandle.svelte';

	import invertScale from '$lib/modules/invertScale.js';
	import filterObject from '$lib/modules/filterObject.js';
	import { annotationWidth, getAnchorPoint, resolveArrowSource } from '$lib/modules/coordinates.js';
	import { ANCHOR_PRESETS } from '$lib/modules/anchorPresets.js';

	let { d } = $props();

	/**
	 * Layer Cake configuration
	 */
	const k = getLayerCakeContext();

	/**
	 * State variables
	 */
	let isEditable = $state(false);
	/** @type {HTMLElement|undefined} The annotation box, measured when the anchor moves. */
	let boxEl = $state();
	// How tall the box is right now, for the arrow handles that ride on its edge.
	// Editor chrome only: a saved arrow's source is stored, never measured.
	let boxHeight = $state(0);
	// The box is given the width the geometry assumes, rather than being left to
	// shrink to fit its text.
	let width = $derived(`${annotationWidth(d)}px`);
	let anchorX = $derived(d.anchorX ?? 0);
	let anchorY = $derived(d.anchorY ?? 0);

	/**
	 * Arrow sides - simplified to just west and east
	 */
	const arrowSides = ['west', 'east'];

	/**
	 * Context variables
	 * @type {ModifyAnnotationFn}
	 */
	const modifyAnnotation = getContext('modifyAnnotation');

	/**
	 * Coordinates
	 */
	// The same function the arrows are drawn from, so the box and its arrows cannot
	// disagree about where the anchor is. Only `translate` stays a percentage: that
	// one is a share of a height nobody can measure.
	let anchor = $derived(getAnchorPoint(d, k));
	let left = $derived(`${anchor.x}px`);
	let top = $derived(`${anchor.y}px`);

	/**
	 * @param {Array} [position] - The x and y pixel coordinates of the draggable element.
	 */
	async function ondrag(position = []) {
		const [x, y] = position;
		// Deliberately a null check, not a truthiness one. 0 is a real position - the
		// anchor sitting exactly on the chart's left or top edge - while null and
		// undefined are how a resize says "this axis didn't move".
		const xVal = x == null ? null : invertScale(k.xScale, x, k.width, k.percentRange);
		const yVal = y == null ? null : invertScale(k.yScale, y, k.height, k.percentRange);

		// Overlay only the axis that moved. Writing undefined over an axis that
		// didn't drops the key and takes the data point with it, which leaves every
		// scale returning NaN and every path built from one silently unrendered.
		const newData = { ...d.data };
		if (xVal?.[0] !== undefined) newData[k.config.x] = xVal[0];
		if (yVal?.[0] !== undefined) newData[k.config.y] = yVal[0];

		/** @type {Record<string, unknown>} */
		const newProps = filterObject(
			{
				// Only include data if it has values (avoid overwriting with empty object)
				data: Object.keys(newData).length > 0 ? newData : undefined,
				dx: xVal?.[1],
				dy: yVal?.[1]
			},
			(d) => d !== undefined
		);

		// Always save current width
		if (width) {
			newProps.width = width;
		}

		modifyAnnotation(d.id, newProps);
	}

	/** Cmd+click cycles: left → center → right → left */
	let alignment = $derived(d.align || 'left');

	/**
	 * Index of the preset nearest the current anchor.
	 */
	function getCurrentAnchorIndex() {
		let nearest = 0;
		let nearestDistance = Infinity;
		ANCHOR_PRESETS.forEach((pos, i) => {
			const distance = (pos.x - anchorX) ** 2 + (pos.y - anchorY) ** 2;
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearest = i;
			}
		});
		return nearest;
	}

	/**
	 * Move the anchor point and leave the annotation where it is on screen. The
	 * box hangs off the anchor, so moving the anchor would drag the box along
	 * with it. Shifting dx and dy by the same distance cancels that out.
	 * @param {number} newAnchorX - The new anchor X, 0-100.
	 * @param {number} newAnchorY - The new anchor Y, 0-100.
	 * @param {ReturnType<typeof snapshot>} [from] - Where the move started from. Defaults to where the annotation is now.
	 */
	function setAnchor(newAnchorX, newAnchorY, from) {
		const start = from ?? snapshot();

		const deltaX = ((newAnchorX - start.anchorX) / 100) * annotationWidth(d);
		const deltaY = ((newAnchorY - start.anchorY) / 100) * start.boxHeight;

		// Arrows hang off the anchor point, and the compensation above slides that
		// point down the chart by deltaY. Take the same off each source so the
		// arrows stay where they are.
		const arrows = d.arrows?.map((a, i) => ({
			...a,
			source: { dx: resolveArrowSource(a).dx, dy: start.sourceDy[i] - deltaY }
		}));

		modifyAnnotation(d.id, {
			anchorX: newAnchorX,
			anchorY: newAnchorY,
			dx: start.dx + (deltaX / k.width) * 100,
			dy: start.dy + (deltaY / k.height) * 100,
			arrows
		});
	}

	/**
	 * Where the annotation and its arrows sit right now. A move measures from one
	 * of these rather than from live values, so a drag can't accumulate drift.
	 */
	function snapshot() {
		return {
			anchorX,
			anchorY,
			dx: d.dx,
			dy: d.dy,
			// The one measurement the config can't supply. Taken once per gesture:
			// the box holds still while the anchor moves across it.
			boxHeight: boxEl?.getBoundingClientRect().height ?? 0,
			sourceDy: (d.arrows ?? []).map((a) => a.source?.dy ?? 0)
		};
	}

	/**
	 * Where the annotation sat when the anchor drag started.
	 * @type {ReturnType<typeof snapshot>|null}
	 */
	let anchorDragStart = null;

	function onclick(e) {
		// Cmd+click: cycle text alignment
		if (e.metaKey && !e.altKey) {
			/** @type {Annotation['align']} */
			let newAlignment;
			if (alignment === 'left') {
				newAlignment = 'center';
			} else if (alignment === 'center') {
				newAlignment = 'right';
			} else {
				newAlignment = 'left';
			}
			modifyAnnotation(d.id, { align: newAlignment });
		}
		// Option+click (Alt+click): cycle anchor position
		else if (e.altKey && !e.metaKey) {
			const next = ANCHOR_PRESETS[(getCurrentAnchorIndex() + 1) % ANCHOR_PRESETS.length];
			setAnchor(next.x, next.y);
		}
	}
</script>

{#if d}
	<Draggable
		id={d.id}
		{left}
		{top}
		{ondrag}
		{width}
		{onclick}
		canDrag={!isEditable}
		bind:boxEl
		bind:boxHeight
		{anchorX}
		{anchorY}
	>
		<div class="layercake-annotation {d.class || ''}" style={d.style} data-id={d.id}>
			<EditableText
				bind:text={d.text}
				bind:isEditable
				{alignment}
				onSave={(newText) => modifyAnnotation(d.id, { text: newText })}
			/>
		</div>
		<ResizeHandles bind:width {ondrag} {anchorX} />
		<AnchorHandle
			id={d.id}
			{anchorX}
			{anchorY}
			{boxEl}
			onDragStart={() => (anchorDragStart = snapshot())}
			onDrag={(x, y) => setAnchor(x, y, anchorDragStart)}
			onDragEnd={() => (anchorDragStart = null)}
		/>
	</Draggable>

	{#each arrowSides as side}
		<ArrowZone {d} {side} {boxHeight} />
	{/each}
{/if}

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
