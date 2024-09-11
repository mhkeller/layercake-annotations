<script>
	let moving = $state(false);

	let { left = 100, top = 100, children } = $props();

	function onmousedown() {
		moving = true;
	}

	function onmousemove(e) {
		if (moving) {
			// TODO broadcast this up to the json spec
			// left += e.movementX;
			// top += e.movementY;
			console.log(e.movementX, e.movementY);
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
