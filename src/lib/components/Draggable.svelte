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
<section {onmousedown} style:left style:top class="draggable" class:canDrag>
	{@render children()}
</section>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.draggable {
		position: absolute;
		width: auto;
	}

	.draggable.canDrag {
		user-select: none;
		cursor: move;
		/* border: solid 5px gray; */
	}
</style>
