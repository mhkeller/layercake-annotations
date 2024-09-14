<script>
	import { getContext } from 'svelte';

	const { padding } = getContext('LayerCake');
	let moving = $state(false);

	let {
		left = 100,
		top = 100,
		ondrag,
		canDrag = true,
		bannedTargets = [],
		noteDimensions = $bindable(),
		children
	} = $props();

	let el = $state();

	const PADDING = 3;
	const BORDER_WIDTH = 1;

	let isBanned = $state(false);

	function onmousedown(e) {
		moving = true;
		isBanned = [...e.target.classList].some((c) => bannedTargets.includes(c));
	}

	function onmousemove(e) {
		if (moving && canDrag && !isBanned) {
			const { left, top } = el.getBoundingClientRect();

			const cssPaddingBorder = PADDING * 2 + BORDER_WIDTH * 2;

			ondrag([
				left - $padding.left - cssPaddingBorder + e.movementX,
				top - $padding.top - cssPaddingBorder + e.movementY
			]);
		}
	}

	function onmouseup() {
		moving = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={el}
	{onmousedown}
	style:left
	style:top
	class="draggable"
	class:canDrag
	bind:clientWidth={noteDimensions[0]}
	bind:clientHeight={noteDimensions[1]}
	style:border="{BORDER_WIDTH}px solid transparent"
	style:padding="{PADDING}px"
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
	}
	.draggable:hover {
		border-color: red !important;
	}

	.draggable.canDrag {
		user-select: none;
		cursor: move;
		/* border: solid 5px gray; */
	}

	.draggable:hover :global(.grabber),
	.draggable:hover :global(.arrow-zone) {
		opacity: 1;
	}
</style>
