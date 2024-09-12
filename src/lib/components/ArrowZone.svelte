<script>
	let { location } = $props();
</script>

<div class="arrow-zone {location}"></div>

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
	.arrow-zone.northwest {
		top: calc(var(--distance) * -1);
		left: calc(var(--distance) * -1);
	}
	.arrow-zone.north {
		top: calc(var(--distance) * -1);
		left: 50%;
		transform: translateX(-50%);
	}
	.arrow-zone.northeast {
		top: calc(var(--distance) * -1);
		right: calc(var(--distance) * -1);
	}
	.arrow-zone.east {
		top: 50%;
		right: calc(var(--distance) * -1);
		transform: translateY(-50%);
	}
	.arrow-zone.southeast {
		bottom: calc(var(--distance) * -1);
		right: calc(var(--distance) * -1);
	}
	.arrow-zone.south {
		bottom: calc(var(--distance) * -1);
		left: 50%;
		transform: translateX(-50%);
	}
	.arrow-zone.southwest {
		bottom: calc(var(--distance) * -1);
		left: calc(var(--distance) * -1);
	}
	.arrow-zone.west {
		top: 50%;
		left: calc(var(--distance) * -1);
		transform: translateY(-50%);
	}
</style>
