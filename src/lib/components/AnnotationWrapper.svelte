<script>
	import { getContext } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';

	let { d, ondrag, addArrow, modifyArrow } = $props();

	const { xGet, yGet, percentRange } = getContext('LayerCake');

	let units = $derived($percentRange === true ? '%' : 'px');

	let noteDimensions = $state([0, 0]);

	let left = $derived(`calc(${$xGet(d)}${units} + ${d.dx}%)`);
	let top = $derived(`calc(${$yGet(d)}${units} + ${d.dy}%)`);

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

<Draggable
	{left}
	{top}
	{ondrag}
	id={d.id}
	canDrag={!isEditable}
	bannedTargets={['arrow-zone']}
	bind:noteDimensions
>
	<div class="layercake-annotation">
		<EditableText text={d.text} bind:isEditable />
	</div>
	<ResizeHandles id={d.id} {ondrag} debug={false} grabbers={['east']} />
</Draggable>
{#each arrowAnchors as anchor}
	<ArrowZone {d} {anchor} {addArrow} {modifyArrow} {noteDimensions} />
{/each}

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
