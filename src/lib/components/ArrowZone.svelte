<script>
	let { id, anchor, addArrow } = $props();

	let moving = $state(false);
	let left = $state(0);
	let top = $state(0);
	let el = $state();
	function onmousedown() {
		moving = true;
	}

	function onmousemove(e) {
		if (moving) {
			left += e.movementX;
			top += e.movementY;

			const rect = el.getBoundingClientRect();
			// --distance and radius
			const x = rect.left - 18 - rect.width / 2;
			const y = rect.top - rect.height / 2;

			addArrow(id, { anchor, x, y });
		}
	}

	function onmouseup() {
		moving = false;
	}

	function onclick() {
		// TODO, togglle clockwise
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={el}
	{onmousedown}
	{onclick}
	class="arrow-zone {anchor}"
	style="transform:translate({left}px, {top}px);"
></div>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.arrow-zone {
		--radius: 15px;
		position: absolute;
		width: var(--radius);
		height: var(--radius);
		border-radius: 50%;
		border: 1px dashed #333;
		--distance: 18px;
		cursor: pointer;
		opacity: 0;
	}
	.arrow-zone.left-top {
		top: calc(var(--distance) * -1);
		left: calc(var(--distance) * -1);
	}
	.arrow-zone.middle-top {
		top: calc(var(--distance) * -1);
		left: 50%;
		transform: translateX(-50%);
	}
	.arrow-zone.right-top {
		top: calc(var(--distance) * -1);
		right: calc(var(--distance) * -1);
	}
	.arrow-zone.right-middle {
		top: 50%;
		right: calc(var(--distance) * -1);
		transform: translateY(-50%);
	}
	.arrow-zone.right-bottom {
		bottom: calc(var(--distance) * -1);
		right: calc(var(--distance) * -1);
	}
	.arrow-zone.middle-bottom {
		bottom: calc(var(--distance) * -1);
		left: 50%;
		transform: translateX(-50%);
	}
	.arrow-zone.left-bottom {
		bottom: calc(var(--distance) * -1);
		left: calc(var(--distance) * -1);
	}
	.arrow-zone.left-middle {
		top: 50%;
		left: calc(var(--distance) * -1);
		transform: translateY(-50%);
	}
</style>
