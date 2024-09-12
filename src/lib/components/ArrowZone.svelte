<script>
	let { id, anchor, addArrow } = $props();

	function onmouseup(e) {
		const rect = e.target.getBoundingClientRect();
		const x = e.clientX - e.offsetX - rect.width;
		const y = e.clientY - e.offsetY;

		addArrow(id, { anchor, x, y });
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="arrow-zone {anchor}" {onmouseup}></div>

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
