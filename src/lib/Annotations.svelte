<script>
	import Editor from './Editor.svelte';
	import Static from './Static.svelte';

	let { edit, annotations } = $props();
</script>

{#if edit}
	<Editor {annotations} />
{:else}
	<Static {annotations} />
{/if}
