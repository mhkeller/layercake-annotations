<script>
	import { getContext, setContext, tick } from 'svelte';

	import Draggable from './Draggable.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';

	import invertScale from '$lib/modules/invertScale.js';
	import filterObject from '$lib/modules/filterObject.js';
	import createRef from '$lib/modules/createRef.svelte.js';

	let { d = $bindable(), deleteAnnotation, containerClass } = $props();

	const { config, xScale, yScale, xGet, yGet, percentRange } = getContext('LayerCake');

	let units = $derived($percentRange === true ? '%' : 'px');

	let noteDimensions = $state([0, 0]);
	const hovering = createRef('');
	setContext('hovering', hovering);

	const isEditing = getContext('isEditing');

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

	/**
	 * @param {Array} [noteCoords] - The x and y coordinates of the draggable element.
	 */
	async function ondrag(noteCoords = []) {
		const [x, y] = noteCoords;
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

		if (noteCoords.length) {
			newProps.noteCoords = noteCoords;
		}

		d = {
			...d,
			...newProps
		};
	}

	function addArrow({ anchor, x, y, clockwise }) {
		const xVal = invertScale($xScale, x);
		const yVal = invertScale($yScale, y);

		const arrow = {
			clockwise,
			source: { anchor },
			target: {
				[$config.x]: xVal[0],
				[$config.y]: yVal[0],
				dx: xVal[1],
				dy: yVal[1]
			}
		};

		const existingArrow = d.arrows.find((a) => a.source.anchor === anchor);

		if (!existingArrow) {
			d.arrows.push(arrow);
		} else {
			existingArrow.target = arrow.target;
		}
		return [xVal, yVal];
	}

	function modifyArrow({ anchor, ...attrs }) {
		const arrow = d.arrows.find((a) => a.source.anchor === anchor);
		if (!arrow) return;

		for (const key in attrs) {
			arrow[key] = attrs[key];
		}
	}

	function deleteArrow(anchor) {
		const len = d.arrows.length;
		d.arrows = d.arrows.filter((a) => a.source.anchor !== anchor);

		// If we were hovering over an empty arrow zone, delete the annotation.
		if (len === d.arrows.length) {
			deleteAnnotation(d.id);
		}
	}

	/**
	 * If we press the delete key while hovering, delete the annotation.
	 */
	async function onkeydown(e) {
		if (!hovering.value) return;

		if (isEditing.value === false && (e.key === 'Delete' || e.key === 'Backspace')) {
			if (hovering.value === 'note') {
				deleteAnnotation(d.id);
			} else {
				deleteArrow(hovering.value);
			}
		}
	}

	$effect(() => {
		if (d) {
			console.log(d.id, hovering.value);
		}
	});
</script>

<svelte:window {onkeydown} />

{#if d}
	<Draggable
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
		<ArrowZone {d} {anchor} {addArrow} {modifyArrow} {noteDimensions} {containerClass} />
	{/each}
{/if}

<style>
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
</style>
