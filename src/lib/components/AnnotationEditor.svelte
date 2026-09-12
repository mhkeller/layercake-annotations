<script>
	/** @typedef {import('../types.js').ModifyAnnotationFn} ModifyAnnotationFn */

	import { getContext } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';
	import AnchorHandle from './AnchorHandle.svelte';

	import invertScale from '$lib/modules/invertScale.js';
	import filterObject from '$lib/modules/filterObject.js';
	import { HANDLE_OFFSET_PX } from '$lib/modules/coordinates.js';

	let { d, containerClass } = $props();

	/**
	 * Layer Cake configuration
	 */
	const { config, xScale, yScale, xGet, yGet, percentRange, width: chartWidth, height: chartHeight } = getContext('LayerCake');
	let units = $derived($percentRange === true ? '%' : 'px');

	/**
	 * State variables
	 */
	let isEditable = $state(false);
	let noteDimensions = $state([0, 0]);
	/** @type {HTMLElement|undefined} The annotation box, measured when the anchor moves. */
	let boxEl = $state();
	// svelte-ignore state_referenced_locally
	let width = $state(d.width);
	// svelte-ignore state_referenced_locally
	let anchorX = $state(d.anchorX ?? 0);
	// svelte-ignore state_referenced_locally
	let anchorY = $state(d.anchorY ?? 0);

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
	let left = $derived(`calc(${$xGet(d.data)}${units} + ${d.dx}%)`);
	let top = $derived(`calc(${$yGet(d.data)}${units} + ${d.dy}%)`);

	/**
	 * @param {Array} [position] - The x and y pixel coordinates of the draggable element.
	 */
	async function ondrag(position = []) {
		const [x, y] = position;
		const xVal = x ? invertScale($xScale, x, $chartWidth, $percentRange) : [];
		const yVal = y ? invertScale($yScale, y, $chartHeight, $percentRange) : [];

		// Build data object, preserving existing values and overlaying new ones
		const newData = filterObject(
			{
				...d.data,
				[$config.x]: xVal[0],
				[$config.y]: yVal[0]
			},
			(d) => d !== undefined
		);

		/** @type {Record<string, unknown>} */
		const newProps = filterObject(
			{
				// Only include data if it has values (avoid overwriting with empty object)
				data: Object.keys(newData).length > 0 ? newData : undefined,
				dx: xVal[1],
				dy: yVal[1]
			},
			(d) => d !== undefined
		);

		// Always save current width
		if (width) {
			newProps.width = width;
		}

		modifyAnnotation(d.id, newProps);
	}

	/**
	 * Text alignment - initialized from data, saved on change
	 * Cmd+click cycles: left → center → right → left
	 */
	// svelte-ignore state_referenced_locally
	let alignment = $state(d.align || 'left');

	/**
	 * Anchor positions - cycle clockwise with Option+click
	 * @type {Array<{x: number, y: number}>}
	 */
	const anchorPositions = [
		{ x: 0, y: 0 },      // top-left (default)
		{ x: 50, y: 0 },     // top-center
		{ x: 100, y: 0 },    // top-right
		{ x: 100, y: 50 },   // middle-right
		{ x: 100, y: 100 },  // bottom-right
		{ x: 50, y: 100 },   // bottom-center
		{ x: 0, y: 100 },    // bottom-left
		{ x: 0, y: 50 },     // middle-left
		{ x: 50, y: 50 }     // center
	];

	/**
	 * Find current anchor position index
	 */
	function getCurrentAnchorIndex() {
		const idx = anchorPositions.findIndex(
			(pos) => pos.x === anchorX && pos.y === anchorY
		);
		return idx >= 0 ? idx : 0;
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

		// Measure rather than read a bound width: the transform's percentage is of
		// the border box, and offsetWidth/clientWidth are each off by a rounding or
		// a border.
		const box = boxEl?.getBoundingClientRect();
		const deltaX = ((newAnchorX - start.anchorX) / 100) * (box?.width ?? 0);
		const deltaY = ((newAnchorY - start.anchorY) / 100) * (box?.height ?? 0);

		anchorX = newAnchorX;
		anchorY = newAnchorY;

		// Arrows hang off the anchor point, and the compensation above slides that
		// point down the chart by deltaY. Take the same off each source so the
		// arrows stay where they are.
		const arrows = d.arrows?.map((a) => ({
			...a,
			source: {
				dx: a.source?.dx ?? (a.side === 'west' ? -HANDLE_OFFSET_PX : HANDLE_OFFSET_PX),
				dy: (start.sourceDy[a.side] ?? a.source?.dy ?? 0) - deltaY
			}
		}));

		modifyAnnotation(d.id, {
			anchorX: newAnchorX,
			anchorY: newAnchorY,
			dx: start.dx + (deltaX / $chartWidth) * 100,
			dy: start.dy + (deltaY / $chartHeight) * 100,
			...(arrows ? { arrows } : {})
		});
	}

	/**
	 * Where the annotation and its arrows sit right now. A move measures from one
	 * of these rather than from live values, so a drag can't accumulate drift.
	 */
	function snapshot() {
		/** @type {Record<string, number>} */
		const sourceDy = {};
		for (const a of d.arrows ?? []) sourceDy[a.side] = a.source?.dy ?? 0;
		return { anchorX, anchorY, dx: d.dx, dy: d.dy, sourceDy };
	}

	/**
	 * Where the annotation sat when the anchor drag started.
	 * @type {ReturnType<typeof snapshot>|null}
	 */
	let anchorDragStart = null;

	function onAnchorDragStart() {
		anchorDragStart = snapshot();
	}

	/**
	 * @param {number} newAnchorX
	 * @param {number} newAnchorY
	 */
	function onAnchorDrag(newAnchorX, newAnchorY) {
		setAnchor(newAnchorX, newAnchorY, anchorDragStart ?? undefined);
	}

	function onAnchorDragEnd() {
		anchorDragStart = null;
	}

	function onclick(e) {
		// Cmd+click: cycle text alignment
		if (e.metaKey && !e.altKey) {
			let newAlignment;
			if (alignment === 'left') {
				newAlignment = 'center';
			} else if (alignment === 'center') {
				newAlignment = 'right';
			} else {
				newAlignment = 'left';
			}
			alignment = newAlignment;
			modifyAnnotation(d.id, { align: newAlignment });
		}
		// Option+click (Alt+click): cycle anchor position
		else if (e.altKey && !e.metaKey) {
			const nextIdx = (getCurrentAnchorIndex() + 1) % anchorPositions.length;
			const newAnchor = anchorPositions[nextIdx];
			setAnchor(newAnchor.x, newAnchor.y);
		}
	}

	const grabbers = ['west', 'east'];

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
		bannedTargets={['arrow-zone', 'anchor-indicator']}
		bind:noteDimensions
		bind:boxEl
		{containerClass}
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
		<ResizeHandles bind:width {ondrag} {grabbers} {containerClass} {anchorX} />
		<AnchorHandle
			id={d.id}
			{anchorX}
			{anchorY}
			onDragStart={onAnchorDragStart}
			onDrag={onAnchorDrag}
			onDragEnd={onAnchorDragEnd}
		/>
	</Draggable>

	{#each arrowSides as side}
		<ArrowZone {d} {side} />
	{/each}
{/if}

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
