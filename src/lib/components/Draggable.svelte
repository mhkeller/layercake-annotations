<script>
	/** @typedef {import('../types.js').HoverState} HoverState */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';

	let {
		id,
		left,
		top,
		ondrag,
		canDrag = true,
		bannedTargets = [],
		noteDimensions = $bindable(),
		containerClass = '.chart-container',
		width,
		onclick,
		children
	} = $props();

	/**
	 * State vars
	 */
	let el = $state();
	let isBanned = $state(false);
	let thisMoving = $state(false);

	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');
	const { padding } = getContext('LayerCake');

	function onmousedown(e) {
		moving.value = true;
		thisMoving = true;
		isBanned = [...e.target.classList].some((c) => bannedTargets.includes(c));
	}

	/**
	 * Broadcast the elements movements on drag
	 */
	function onmousemove(e) {
		if (thisMoving && canDrag && !isBanned) {
			const { left, top } = el.getBoundingClientRect();

			const parent = el.closest(containerClass).getBoundingClientRect();

			ondrag([
				left - parent.left - $padding.left + e.movementX,
				top - parent.top - $padding.top - 0 + e.movementY
			]);
		}
	}

	function onmouseup() {
		moving.value = false;
		thisMoving = false;
	}
	function onmouseover() {
		if (moving.value) return;
		hovering.value = { annotationId: id, type: 'body' };
	}
	function onmouseout() {
		if (moving.value) return;
		hovering.value = null;
	}
</script>

<div
	bind:this={el}
	style:left
	style:top
	style:width
	class="draggable"
	class:canDrag
	class:hovering={hovering.value?.annotationId === id}
	{onclick}
	{onmousedown}
	{onmouseover}
	{onmouseout}
	onfocus={onmouseover}
	onblur={onmouseout}
	onkeydown={(e) => e.key === 'Delete' && onclick(e)}
	role="button"
	tabindex="0"
	aria-label="Annotation - drag to move, press Delete to remove"
	bind:clientWidth={noteDimensions[0]}
	bind:clientHeight={noteDimensions[1]}
>
	{@render children()}
</div>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.draggable {
		position: absolute;
		display: inline-block;
		box-sizing: border-box;
		transition: border-color 250ms;
		border-radius: 2px;
		padding: 3px;
		border: 1px solid transparent;
	}
	.draggable.hovering {
		border-color: red;
	}

	.draggable.canDrag {
		user-select: none;
		cursor: move;
	}

	.draggable.hovering :global(.grabber) {
		opacity: 1;
	}
</style>
