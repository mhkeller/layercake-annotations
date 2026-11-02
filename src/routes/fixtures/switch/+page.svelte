<!--
	A test fixture for tests/switch.test.js: `Annotations`, which is the framed
	editor on the dev server, with a checkbox for its `hideTools`.
-->
<script>
	import { LayerCake } from 'layercake';

	import { Annotations } from '$lib/index.js';

	let annotations = $state([{ id: 0, data: { x: 5, y: 5 }, text: 'A note', width: '100px' }]);
	let hideTools = $state(false);

	const data = [
		{ x: 0, y: 0 },
		{ x: 10, y: 10 }
	];
</script>

<svelte:head>
	<title>Switch fixture</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<label>
	<input type="checkbox" bind:checked={hideTools} />
	Hide tools
</label>

<div class="chart-container">
	<LayerCake {data} x="x" y="y" padding={{ top: 4, right: 4, bottom: 4, left: 4 }}>
		<Annotations bind:annotations {hideTools} />
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 600px;
		height: 400px;
		margin: 40px;
	}
</style>
