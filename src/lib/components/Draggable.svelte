<script>
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
		children
	} = $props();

	/**
	 * State vars
	 */
	let el = $state();
	let isBanned = $state(false);
	let thisMoving = $state(false);

	const hovering = getContext('hovering');
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
		hovering.value = `${id}_body`;
	}
	function onmouseout() {
		if (moving.value) return;
		hovering.value = '';
	}
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
	bind:this={el}
	{onmousedown}
	style:left
	style:top
	style:width
	class="draggable"
	class:canDrag
	class:hovering={hovering.value.split('_')[0] === String(id)}
	{onmouseover}
	{onmouseout}
	bind:clientWidth={noteDimensions[0]}
	bind:clientHeight={noteDimensions[1]}
>
	{@render children()}
</div>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.draggable {
		position: absolute;
		width: auto;
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
		/* border: solid 5px gray; */
	}

	.draggable.hovering :global(.grabber) {
		opacity: 1;
	}
</style>
