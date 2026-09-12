<script>
	/** @typedef {import('../types.js').HoverState} HoverState */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	let {
		id,
		left,
		top,
		ondrag,
		canDrag = true,
		bannedTargets = [],
		noteDimensions = $bindable(),
		// The box itself, so anchor math can measure it. A CSS percentage in
		// `transform` is measured against the border box, while noteDimensions is
		// the padding box, and the two differ by the border.
		boxEl = $bindable(),
		width,
		onclick,
		children,
		anchorX = 0,
		anchorY = 0
	} = $props();

	// The standalone `translate` property rather than `transform`, so a consumer's
	// own transform in `d.style` survives.
	let translateStyle = $derived(
		anchorX || anchorY ? `-${anchorX}% -${anchorY}%` : undefined
	);

	/**
	 * State vars
	 */
	let isBanned = $state(false);
	let thisMoving = $state(false);

	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');
	const k = getLayerCakeContext();

	function onmousedown(e) {
		moving.value = true;
		thisMoving = true;
		isBanned = [...e.target.classList].some((c) => bannedTargets.includes(c));
	}

	/**
	 * Broadcast the elements movements on drag
	 * Position reported is the anchor point, not top-left corner
	 */
	function onmousemove(e) {
		if (thisMoving && canDrag && !isBanned) {
			// Layer Cake hands us its own container, so there's nothing to look up
			// and nothing for a consumer to configure. It's undefined until mount.
			if (!k.element) return;

			const rect = boxEl.getBoundingClientRect();
			const parent = k.element.getBoundingClientRect();

			// Calculate anchor point position (accounting for transform offset)
			const anchorOffsetX = (anchorX / 100) * rect.width;
			const anchorOffsetY = (anchorY / 100) * rect.height;

			ondrag([
				rect.left - parent.left - k.padding.left + anchorOffsetX + e.movementX,
				rect.top - parent.top - k.padding.top + anchorOffsetY + e.movementY
			]);
		}
	}

	function onmouseup() {
		moving.value = false;
		thisMoving = false;
	}
	// enter/leave rather than over/out: the box has children that take the mouse
	// themselves, like the resize grabbers and the anchor handle, and over/out
	// count a move onto a child as leaving the box.
	function onmouseenter() {
		if (moving.value) return;
		hovering.value = { annotationId: id, type: 'body' };
	}
	function onmouseleave() {
		if (moving.value) return;
		hovering.value = null;
	}
</script>

<div
	bind:this={boxEl}
	style:left
	style:top
	style:width
	style:translate={translateStyle}
	class="draggable"
	class:canDrag
	class:hovering={hovering.value?.annotationId === id}
	{onclick}
	{onmousedown}
	{onmouseenter}
	{onmouseleave}
	onfocus={onmouseenter}
	onblur={(e) => {
		// Tabbing to the resize grabbers or the anchor handle moves focus to a
		// child, which still counts as leaving this element. Stay hovered so those
		// controls don't vanish as they're reached.
		if (!boxEl?.contains(e.relatedTarget)) onmouseleave();
	}}
	onkeydown={(e) => e.key === 'Delete' && onclick(e)}
	role="button"
	tabindex="0"
	aria-label="Annotation - drag to move, press Delete to remove"
	bind:clientWidth={noteDimensions[0]}
	bind:clientHeight={noteDimensions[1]}
>
	{@render children()}
</div>

<svelte:window {onmouseup} {onmousemove} />

<style>
	.draggable {
		position: absolute;
		display: inline-block;
		box-sizing: border-box;
		transition: border-color 250ms;
		border-radius: 2px;
		padding: 3px;
		border: 1px solid transparent;
	}
	.draggable.hovering {
		border-color: red;
	}

	.draggable.canDrag {
		user-select: none;
		cursor: move;
	}

	.draggable.hovering :global(.grabber) {
		opacity: 1;
	}
</style>
