<script>
	/** @typedef {import('./types.js').Annotation} Annotation */

	import { Svg, Html } from 'layercake';

	import AnnotationsData from '$lib/components/AnnotationsData.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';

	/** @type {{ annotations?: Annotation[] }} */
	let { annotations = [] } = $props();
</script>

<Svg>
	<svelte:fragment slot="defs">
		<ArrowheadMarker />
	</svelte:fragment>
	<Arrows {annotations} />
</Svg>

<Html>
	<AnnotationsData {annotations} />
</Html>
