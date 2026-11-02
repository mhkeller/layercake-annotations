<!--
	The README's "saving to a file" setup, as a full example: the chart starts from
	chart.annotations.js and saveTo writes every edit back into it, through the
	plugin in vite.config.js.
-->
<script>
	import { LayerCake, Svg } from 'layercake';
	import { dev } from '$app/environment';
	import { resolve } from '$app/paths';

	import { Annotations, saveTo, serializeAnnotations } from '$lib/index.js';
	import saved from './chart.annotations.js';

	import Line from '../_components/Line.svelte';
	import AxisX from '../_components/AxisX.svelte';
	import AxisY from '../_components/AxisY.svelte';
	import data from '../_data/points.csv';

	data.forEach((d) => {
		d.myY = +d.myY;
	});

	let annotations = $state(/** @type {import('$lib/index.js').Annotation[]} */ (saved));

	const source =
		'https://github.com/mhkeller/layercake-annotations/tree/main/src/routes/save-to-file';
</script>

<svelte:head>
	<title>Saving to a file · Layer Cake Annotations</title>
</svelte:head>

<div class="page">
	<a class="back" href={resolve('/')}>Demo</a>
	<h1>Saving to a file</h1>

	{#if dev}
		<p>
			Edit the chart. A second after your last change, the config is written into
			<code>src/routes/save-to-file/chart.annotations.js</code>, and reloading the page reads it
			back.
		</p>
	{:else}
		<p>
			Saving needs the dev server, so on this site the chart shows its notes without the editor, as
			a published chart does. To try it, clone the repo, run <code>pnpm dev</code> and open
			<code>/save-to-file</code>.
		</p>
	{/if}

	<div class="chart-container">
		<LayerCake
			padding={{ top: 4, right: 4, bottom: 24, left: 30 }}
			x="myX"
			y="myY"
			yDomain={[0, 11]}
			{data}
		>
			<Svg>
				<AxisX dy={16} />
				<AxisY ticks={4} dx={-6} />
				<Line stroke="#141414" />
			</Svg>
			<Annotations
				bind:annotations
				onsave={saveTo('src/routes/save-to-file/chart.annotations.js')}
			/>
		</LayerCake>
	</div>

	<h2>chart.annotations.js</h2>
	<pre>export default {serializeAnnotations($state.snapshot(annotations))};</pre>

	<p>
		The setup is the plugin in <code>vite.config.js</code>, the file, and the
		<code>saveTo</code> call in this page. See <a href="{source}/+page.svelte">the page's source</a>
		and
		<a
			href="https://github.com/mhkeller/layercake-annotations#autmoatically-saving-to-a-file-in-your-project"
			>the README</a
		>.
	</p>
</div>

<style>
	.page {
		box-sizing: border-box;
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: 28px 32px 24px;
		flex: none;
	}
	h1 {
		font-family: var(--display);
		margin: 12px 0;
	}
	h2 {
		font-family: var(--display);
		font-size: 13px;
		letter-spacing: 0.08em;
		margin: 24px 0 6px;
	}
	p {
		font-size: 15px;
		line-height: 22px;
		color: var(--muted);
		max-width: 38em;
	}
	a {
		color: var(--ink);
	}
	.back::before {
		content: '← ';
	}
	.chart-container {
		width: 100%;
		height: 260px;
		margin-top: 20px;
		font-size: 15px;
	}
	.chart-container :global(.path-line) {
		stroke-width: 3;
	}
	pre {
		max-height: 320px;
		overflow: auto;
		padding: 12px;
		font-size: 13px;
		background: rgba(0, 0, 0, 0.04);
	}
</style>
