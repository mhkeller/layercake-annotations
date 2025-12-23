<script>
	/** @typedef {import('./types.js').Annotation} Annotation */

	import { Svg, Html } from 'layercake';

	import AnnotationsData from '$lib/components/AnnotationsData.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';

	/** @type {{ annotations?: Annotation[] }} */
	let { annotations = [] } = $props();
</script>

{#snippet defs()}
	<ArrowheadMarker />
{/snippet}

<Svg {defs} pointerEvents={false}>
	<Arrows {annotations} />
</Svg>

<Html pointerEvents={false}>
	<AnnotationsData {annotations} />
</Html>
