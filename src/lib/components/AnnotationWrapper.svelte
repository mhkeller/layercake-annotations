<script>
	import { getContext } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';

	let { data, ondrag } = $props();

	const { xGet, yGet, percentRange } = getContext('LayerCake');

	let units = $derived($percentRange === true ? '%' : 'px');

	let left = $derived(`calc(${$xGet(data)}${units} + ${data.dx}%)`);
	let top = $derived(`calc(${$yGet(data)}${units} + ${data.dy}%)`);

	let isEditable = $state(false);
</script>

<Draggable {left} {top} {ondrag} id={data.id} canDrag={!isEditable}>
	<div class="layercake-annotation" data-id={data.id}>
		<EditableText text={data.text} bind:isEditable />
	</div>
	<ResizeHandles debug={false} grabbers={['east']} />
</Draggable>

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
