<!--
  @component
  The positioned box around an annotation's text. Edit mode and published charts
  both draw their boxes with this, so the two look the same.
 -->
<script>
	/** @typedef {import('../types.js').ResolvedAnnotation} ResolvedAnnotation */

	import { getLayerCakeContext } from 'layercake';

	import { annotationWidth, getAnchorPoint } from '$lib/modules/coordinates.js';

	/**
	 * @type {{
	 *   d: ResolvedAnnotation,
	 *   el?: HTMLElement,
	 *   class?: import('svelte/elements').ClassValue,
	 *   content?: import('svelte').Snippet,
	 *   children?: import('svelte').Snippet
	 * } & Omit<import('svelte/elements').HTMLAttributes<HTMLDivElement>, 'class' | 'children'>}
	 */
	let {
		d,
		// The box itself, so anchor math can measure its border box — the same box
		// a percentage in `translate` resolves against.
		el = $bindable(),
		class: className,
		// What stands in for the plain text, like the editor's editable text.
		content,
		// What rides on the box next to the text, like the editor's handles.
		children,
		// Everything else lands on the box itself: handlers, ARIA and attachments.
		...rest
	} = $props();

	const k = getLayerCakeContext();

	// The same function the arrows are drawn from, so the box and its arrows cannot
	// disagree about where the anchor is. Only `translate` stays a percentage: that
	// one is a share of a height nobody can measure.
	let anchor = $derived(getAnchorPoint(d, k));

	// The box is given the width the geometry assumes, rather than being left to
	// shrink to fit its text.
	let width = $derived(annotationWidth(d));

	// The standalone `translate` property rather than `transform`, so a consumer's
	// own transform in `d.style` survives.
	let translate = $derived(d.anchorX || d.anchorY ? `-${d.anchorX}% -${d.anchorY}%` : undefined);
</script>

<div
	{...rest}
	bind:this={el}
	class={['annotation-box', className]}
	style:left="{anchor.x}px"
	style:top="{anchor.y}px"
	style:width="{width}px"
	style:translate
>
	<!-- The alignment is set here and inherited by whatever text sits inside. -->
	<div
		class={['layercake-annotation', d.class]}
		style={d.style}
		style:text-align={d.align}
		data-id={d.id}
	>
		{#if content}
			{@render content()}
		{:else}
			<pre>{d.text}</pre>
		{/if}
	</div>
	{@render children?.()}
</div>

<style>
	.annotation-box {
		position: absolute;
		display: inline-block;
		box-sizing: border-box;
		transition: border-color 250ms;
		border-radius: 2px;
		padding: 3px;
		border: 1px solid transparent;
	}
	.layercake-annotation {
		width: 100%;
		height: 100%;
	}
	/* The text can come from a snippet in another component, which scoped CSS doesn't reach */
	.layercake-annotation :global(pre) {
		margin: 0;
		font-family: inherit;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>
