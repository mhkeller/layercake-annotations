<script>
	/** @typedef {import('../types.js').ModifyAnnotationFn} ModifyAnnotationFn */

	import { getContext } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';

	import invertScale from '$lib/modules/invertScale.js';
	import filterObject from '$lib/modules/filterObject.js';

	let { d, containerClass } = $props();

	/**
	 * Layer Cake configuration
	 */
	const { config, xScale, yScale, xGet, yGet, percentRange } = getContext('LayerCake');
	let units = $derived($percentRange === true ? '%' : 'px');

	/**
	 * State variables
	 */
	let isEditable = $state(false);
	let noteDimensions = $state([0, 0]);
	// svelte-ignore state_referenced_locally
	let width = $state(d.width);

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
	let left = $derived(`calc(${$xGet(d)}${units} + ${d.dx}%)`);
	let top = $derived(`calc(${$yGet(d)}${units} + ${d.dy}%)`);

	/**
	 * @param {Array} [position] - The x and y pixel coordinates of the draggable element.
	 */
	async function ondrag(position = []) {
		const [x, y] = position;
		const xVal = x ? invertScale($xScale, x) : [];
		const yVal = y ? invertScale($yScale, y) : [];

		const newProps = filterObject(
			{
				[$config.x]: xVal[0],
				[$config.y]: yVal[0],
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

	function onclick(e) {
		if (e.metaKey) {
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
		bannedTargets={['arrow-zone']}
		bind:noteDimensions
		{containerClass}
	>
		<div class="layercake-annotation" data-id={d.id}>
			<EditableText bind:text={d.text} bind:isEditable {alignment} />
		</div>
		<ResizeHandles bind:width {ondrag} {grabbers} {containerClass} />
	</Draggable>

	{#each arrowSides as side}
		<ArrowZone {d} {side} {noteDimensions} />
	{/each}
{/if}

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
