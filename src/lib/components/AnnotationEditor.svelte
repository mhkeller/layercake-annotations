<script>
	import { getContext, setContext, tick } from 'svelte';

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

	/**
	 * Drag config
	 */
	const arrowAnchors = [
		'middle-top',
		'right-top',
		'right-middle',
		'right-bottom',
		'middle-bottom',
		'left-bottom',
		'left-middle',
		'left-top'
	];

	/**
	 * Context variables
	 */
	const modifyAnnotation = getContext('modifyAnnotation');

	/**
	 * Coordinates
	 */
	let left = $derived(`calc(${$xGet(d)}${units} + ${d.dx}%)`);
	let top = $derived(`calc(${$yGet(d)}${units} + ${d.dy}%)`);

	/**
	 * @param {Array} [coords] - The x and y coordinates of the draggable element.
	 */
	async function ondrag(coords = []) {
		const [x, y] = coords;
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

		if (coords.length) {
			newProps.coords = coords;
		}

		modifyAnnotation(d.id, newProps);
	}
</script>

{#if d}
	<Draggable
		id={d.id}
		{left}
		{top}
		{ondrag}
		canDrag={!isEditable}
		bannedTargets={['arrow-zone']}
		bind:noteDimensions
		{containerClass}
	>
		<div class="layercake-annotation" data-id={d.id}>
			<EditableText bind:text={d.text} bind:isEditable />
		</div>
		<ResizeHandles {ondrag} debug={false} grabbers={['east']} />
	</Draggable>

	{#each arrowAnchors as anchor}
		<ArrowZone {d} {anchor} {noteDimensions} {containerClass} />
	{/each}
{/if}

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
