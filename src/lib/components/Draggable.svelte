<script>
	let moving = $state(false);

	let {
		id,
		left = 100,
		top = 100,
		ondrag,
		canDrag = true,
		bannedTargets = [],
		children
	} = $props();

	let isBanned = $state(false);

	function onmousedown(e) {
		moving = true;
		isBanned = [...e.target.classList].some((c) => bannedTargets.includes(c));
	}

	function onmousemove(e) {
		if (moving && canDrag && !isBanned) {
			ondrag(id, { x: e.movementX, y: e.movementY });
		}
	}

	function onmouseup() {
		moving = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div {onmousedown} style:left style:top class="draggable" class:canDrag>
	{@render children()}
</div>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.draggable {
		position: absolute;
		width: auto;
		border: 1px solid transparent;
		padding: 3px;
		transition: border-color 0.2s;
	}
	.draggable:hover {
		border-color: red;
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
