<script>
	let moving = $state(false);

	let { id, left = 100, top = 100, ondrag, children } = $props();

	function onmousedown() {
		moving = true;
	}

	function onmousemove(e) {
		if (moving) {
			ondrag(id, { x: e.movementX, y: e.movementY });
		}
	}

	function onmouseup() {
		moving = false;
	}

	$inspect({ moving });

	// 	$: console.log(moving);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section {onmousedown} style:left style:top class="draggable">
	{@render children()}
</section>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.draggable {
		user-select: none;
		cursor: move;
		border: solid 1px gray;
		position: absolute;
		width: auto;
	}
</style>
