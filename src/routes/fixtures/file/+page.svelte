<!--
	A test fixture for tests/saveFile.test.js: a chart that saves its one note
	into notes.annotations.js, beside this page, with saveTo and the Vite plugin.
-->
<script>
	import { LayerCake } from 'layercake';

	import { Annotations, saveTo } from '$lib/index.js';
	import saved from './notes.annotations.js';

	let annotations = $state(saved);

	const data = [
		{ x: 0, y: 0 },
		{ x: 10, y: 10 }
	];
</script>

<svelte:head>
	<title>Save to file fixture</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="chart-container">
	<LayerCake {data} x="x" y="y">
		<Annotations
			bind:annotations
			onsave={saveTo('src/routes/fixtures/file/notes.annotations.js')}
		/>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 600px;
		height: 400px;
		margin: 40px;
	}
</style>
