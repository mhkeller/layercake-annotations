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
		// The box itself, so anchor math can measure its border box — the same box
		// a percentage in `translate` resolves against.
		boxEl = $bindable(),
		// How tall that box is. The one dimension the config can't supply: it comes
		// out of how the text wraps, so only the DOM knows it.
		boxHeight = $bindable(0),
		width,
		onclick,
		children,
		anchorX = 0,
		anchorY = 0
	} = $props();

	// The standalone `translate` property rather than `transform`, so a consumer's
	// own transform in `d.style` survives.
	let translateStyle = $derived(anchorX || anchorY ? `-${anchorX}% -${anchorY}%` : undefined);

	/**
	 * State vars
	 */
	let thisMoving = $state(false);

	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');
	const k = getLayerCakeContext();

	// How far the pointer sits from the anchor point, so the box doesn't jump under
	// the cursor on the first move. Measured once: the pointer carries the rest.
	let grabX = 0;
	let grabY = 0;

	function onpointerdown(e) {
		moving.value = true;
		thisMoving = true;
		if (!boxEl) return;

		// Capture on whatever was pressed rather than on the box, so every later
		// move and the release come to this annotation however far the pointer
		// travels. Capture retargets the events that follow, and a click reported
		// against the box instead of against the text would cost the double-click
		// that opens the editor. Moves still reach the handler below by bubbling.
		e.target.setPointerCapture(e.pointerId);

		const rect = boxEl.getBoundingClientRect();
		grabX = e.clientX - rect.left - (anchorX / 100) * rect.width;
		grabY = e.clientY - rect.top - (anchorY / 100) * rect.height;
	}

	/**
	 * Broadcast the element's movements on drag. The position reported is the
	 * anchor point, not the top-left corner.
	 */
	function onpointermove(e) {
		if (!thisMoving || !canDrag) return;

		// Absolute, rather than summing movementX: that drifts under page zoom and
		// loses a frame's motion whenever the pointer leaves the window.
		const [px, py] = k.pointer(e);
		// NaN until Layer Cake's container mounts.
		if (!Number.isFinite(px)) return;

		ondrag([px - grabX, py - grabY]);
	}

	function onpointerup() {
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
	bind:offsetHeight={boxHeight}
	style:left
	style:top
	style:width
	style:translate={translateStyle}
	class="draggable"
	class:canDrag
	class:hovering={hovering.value?.annotationId === id}
	{onclick}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
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
>
	{@render children()}
</div>

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
