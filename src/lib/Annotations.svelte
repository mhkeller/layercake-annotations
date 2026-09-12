<script>
	/** @typedef {import('./types.js').Annotation} Annotation */

	import Editor from './Editor.svelte';
	import Static from './Static.svelte';

	/** @type {{ annotations?: Annotation[], editable?: boolean, containerClass?: string }} */
	let { annotations = $bindable([]), editable = true, containerClass } = $props();
</script>

{#if editable}
	<Editor bind:annotations {containerClass} />
{:else}
	<Static {annotations} />
{/if}
