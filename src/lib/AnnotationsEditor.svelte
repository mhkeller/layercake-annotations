<!--
  @component
  The editor, in a frame around the chart's plotting area. A tab in the frame's corner switches editing on and off and copies the config. It ships the editor in production too: for a chart that only shows its notes there, use `Annotations`.
 -->
<script>
	/** @typedef {import('./types.js').AnnotationsEditorProps} AnnotationsEditorProps */

	import Editor from './Editor.svelte';
	import Static from './Static.svelte';
	import EditFrame from './components/EditFrame.svelte';

	/** @type {AnnotationsEditorProps} */
	let { annotations = $bindable([]), editable = $bindable(true), onsave } = $props();
</script>

<!-- The frame comes first, so a note that runs past the plotting area covers its
     border in both modes. The tab stays on top of the notes by its z-index. -->
<EditFrame bind:editable {annotations} />
{#if editable}
	<Editor bind:annotations {onsave} />
{:else}
	<Static {annotations} />
{/if}
