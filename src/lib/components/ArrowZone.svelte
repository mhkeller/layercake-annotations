<script>
	let { id, anchor, addArrow } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="arrow-zone {anchor}"
	onmouseup={(e) => addArrow(id, { anchor, x: e.clientX, y: e.clientY })}
></div>

<style>
	.arrow-zone {
		position: absolute;
		width: 15px;
		height: 15px;
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
