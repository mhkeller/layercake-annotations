<script>
	/** @typedef {import('./types.js').Annotation} Annotation */

	import { Svg, Html } from 'layercake';

	import AnnotationBox from '$lib/components/AnnotationBox.svelte';
	import ArrowheadMarker from '$lib/components/ArrowheadMarker.svelte';
	import Arrows from '$lib/components/Arrows.svelte';

	import { resolveAnnotation } from './modules/coordinates.js';

	/** @type {{ annotations?: Annotation[] }} */
	let { annotations = [] } = $props();

	const markerId = $props.id();

	// Every default filled in, once, for everything below that draws.
	let resolved = $derived(annotations.map(resolveAnnotation));
</script>

{#snippet defs()}
	<ArrowheadMarker {markerId} />
{/snippet}

<Svg {defs} pointerEvents={false}>
	<Arrows annotations={resolved} {markerId} />
</Svg>

<Html pointerEvents={false}>
	<!-- No key: a published config may leave ids out or repeat them. -->
	<div class="layercake-annotations">
		{#each resolved as d}
			<AnnotationBox {d} class="static-wrapper" />
		{/each}
	</div>
</Html>
