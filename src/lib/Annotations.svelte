<script>
	import Editor from './Editor.svelte';
	import Static from './Static.svelte';

	let { edit, annotations = $bindable() } = $props();
</script>

{#if edit}
	<Editor bind:annotations />
{:else}
	<Static {annotations} />
{/if}
