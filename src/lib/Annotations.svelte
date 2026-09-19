<script>
	/** @typedef {import('./types.js').Annotation} Annotation */
	/** @typedef {import('./types.js').SaveAnnotationConfigFn} SaveAnnotationConfigFn */

	import Editor from './Editor.svelte';
	import Static from './Static.svelte';

	/** @type {{ annotations?: Annotation[], editable?: boolean, onsave?: SaveAnnotationConfigFn }} */
	let { annotations = $bindable([]), editable = true, onsave } = $props();
</script>

{#if editable}
	<Editor bind:annotations {onsave} />
{:else}
	<Static {annotations} />
{/if}
