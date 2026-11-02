<!--
	The chart the save fixture mounts, for tests/save.test.js and tests/frame.test.js:
	one note, on a linear or a time x scale. `ui` picks how editing is switched: a
	checkbox of the page's own that swaps `AnnotationsEditorPlain` and
	`AnnotationsStatic`, or the switch in
	`AnnotationsEditor`'s frame. Either way the page has one checkbox.
-->
<script>
	import { onMount } from 'svelte';
	import { LayerCake } from 'layercake';
	import { scaleLinear, scaleTime } from 'd3-scale';

	import { AnnotationsEditor, AnnotationsEditorPlain, AnnotationsStatic } from '$lib/index.js';

	/** @typedef {import('$lib/index.js').Annotation} Annotation */
	/** @typedef {import('$lib/types.js').OnSaveFn} OnSaveFn */

	/** @type {{ scale?: 'linear' | 'time', ui?: 'own' | 'frame', onsave?: OnSaveFn }} */
	let { scale = 'linear', ui = 'own', onsave } = $props();

	const time = $derived(scale === 'time');

	const data = $derived(
		time
			? [
					{ date: new Date('2024-01-01T00:00:00.000Z'), y: 0 },
					{ date: new Date('2024-12-31T00:00:00.000Z'), y: 10 }
				]
			: [
					{ x: 0, y: 0 },
					{ x: 10, y: 10 }
				]
	);

	/**
	 * The one note, in the middle of the chart. On the time scale its x value is a real Date.
	 * @returns {Annotation}
	 */
	function firstNote() {
		return {
			id: 0,
			data: time ? { date: new Date('2024-03-15T00:00:00.000Z'), y: 5 } : { x: 5, y: 5 },
			text: 'A note',
			width: '100px'
		};
	}

	let annotations = $state([firstNote()]);

	let editable = $state(true);

	onMount(() => {
		/** @type {any} */ (window).__chart = {
			/** What the chart holds right now, as a plain copy. */
			annotations: () => $state.snapshot(annotations),

			/** Whether the chart's own live state can be cloned. */
			liveStateClones: () => {
				try {
					structuredClone(annotations);
					return true;
				} catch {
					return false;
				}
			}
		};
	});
</script>

{#if ui === 'own'}
	<label>
		<input type="checkbox" bind:checked={editable} />
		Editable
	</label>
{/if}

<div class="chart-container">
	<LayerCake {data} x={time ? 'date' : 'x'} y="y" xScale={time ? scaleTime() : scaleLinear()}>
		{#if ui === 'frame'}
			<AnnotationsEditor bind:annotations bind:editable {onsave} />
		{:else if editable}
			<AnnotationsEditorPlain bind:annotations {onsave} />
		{:else}
			<AnnotationsStatic {annotations} />
		{/if}
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 600px;
		height: 400px;
		margin: 40px;
	}
</style>
