<script>
	import { getContext } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';

	let { data, ondrag, addArrow, modifyArrow } = $props();

	const { xGet, yGet, percentRange } = getContext('LayerCake');

	let units = $derived($percentRange === true ? '%' : 'px');

	let left = $derived(`calc(${$xGet(data)}${units} + ${data.dx}%)`);
	let top = $derived(`calc(${$yGet(data)}${units} + ${data.dy}%)`);

	let isEditable = $state(false);
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
</script>

<Draggable {left} {top} {ondrag} id={data.id} canDrag={!isEditable} bannedTargets={['arrow-zone']}>
	<div class="layercake-annotation">
		<EditableText text={data.text} bind:isEditable />
	</div>
	<ResizeHandles id={data.id} {ondrag} debug={false} grabbers={['east']} />
	{#each arrowAnchors as anchor}
		<ArrowZone id={data.id} {anchor} {addArrow} {modifyArrow} />
	{/each}
</Draggable>

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
