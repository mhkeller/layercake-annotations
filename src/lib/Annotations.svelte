<!--
  @component
  `AnnotationsEditor` while you work, and `AnnotationsStatic` in a production build, which leaves the editor's code out. `hideTools` shows the static notes while you work too.
 -->
<script>
	/** @typedef {import('./types.js').AnnotationsProps} AnnotationsProps */

	import { DEV } from 'esm-env';

	import AnnotationsEditor from './AnnotationsEditor.svelte';
	import Static from './Static.svelte';

	/** @type {AnnotationsProps} */
	let {
		annotations = $bindable([]),
		editable = $bindable(true),
		hideTools = false,
		onsave
	} = $props();
</script>

<!-- A build makes DEV the constant false, so the bundler drops this branch and
     the editor with it. hideTools can't bring it back. -->
{#if DEV && !hideTools}
	<AnnotationsEditor bind:annotations bind:editable {onsave} />
{:else}
	<Static {annotations} />
{/if}
