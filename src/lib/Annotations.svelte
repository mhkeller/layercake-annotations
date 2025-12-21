<script>
	/** @typedef {import('./types.js').Annotation} Annotation */

	import Editor from './Editor.svelte';
	import Static from './Static.svelte';

	/** @type {{ annotations?: Annotation[], editable?: boolean }} */
	let { annotations = $bindable([]), editable = true } = $props();
</script>

{#if editable}
	<Editor bind:annotations />
{:else}
	<Static {annotations} />
{/if}
