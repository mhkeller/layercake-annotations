<script>
	import { getContext, tick } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';
	import invertScale from '$lib/modules/invertScale.js';

	let { d = $bindable() } = $props();

	const { config, xScale, yScale, xGet, yGet, percentRange } = getContext('LayerCake');

	let units = $derived($percentRange === true ? '%' : 'px');

	let noteDimensions = $state([0, 0]);
	// let noteCoords = $state([0, 0]);

	let left = $derived(`calc(${$xGet(d)}${units} + ${d.dx}%)`);
	let top = $derived(`calc(${$yGet(d)}${units} + ${d.dy}%)`);

	let isEditable = $state(false);
	// const arrowAnchors = [
	// 	'middle-top',
	// 	'right-top',
	// 	'right-middle',
	// 	'right-bottom',
	// 	'middle-bottom',
	// 	'left-bottom',
	// 	'left-middle',
	// 	'left-top'
	// ];

	async function ondrag([x, y]) {
		const xVal = invertScale($xScale, x);
		const yVal = invertScale($yScale, y);

		console.log(x, xVal, [...d.noteCoords]);
		d = {
			...d,
			[$config.x]: xVal[0],
			[$config.y]: yVal[0],
			dx: xVal[1],
			dy: yVal[1]
		};
	}
</script>

<Draggable
	{left}
	{top}
	{ondrag}
	canDrag={!isEditable}
	bannedTargets={['arrow-zone']}
	bind:noteDimensions
>
	<div class="layercake-annotation">
		<EditableText text={d.text} bind:isEditable />
	</div>
	<!-- <ResizeHandles id={d.id} {ondrag} debug={false} grabbers={['east']} /> -->
</Draggable>

<!-- {#each arrowAnchors as anchor}
	<ArrowZone {d} {anchor} {addArrow} {modifyArrow} {noteDimensions} />
{/each} -->

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
