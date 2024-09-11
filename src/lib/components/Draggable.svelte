<script>
	let moving = $state(false);

	let { id, left = 100, top = 100, ondrag, canDrag = true, children } = $props();

	function onmousedown() {
		moving = true;
	}

	function onmousemove(e) {
		if (moving && canDrag) {
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

	.draggable:hover :global(.grabber) {
		opacity: 1;
	}
</style>
