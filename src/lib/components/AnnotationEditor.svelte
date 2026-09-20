<script>
	/** @typedef {import('../types.js').Annotation} Annotation */
	/** @typedef {import('../types.js').ResolvedAnnotation} ResolvedAnnotation */
	/** @typedef {import('../types.js').HoverState} HoverState */
	/** @typedef {import('../types.js').ModifyAnnotationFn} ModifyAnnotationFn */
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext, onDestroy } from 'svelte';
	import { getLayerCakeContext } from 'layercake';

	import AnnotationBox from './AnnotationBox.svelte';
	import EditableText from './EditableText.svelte';
	import ResizeHandles from './ResizeHandles.svelte';
	import ArrowZone from './ArrowZone.svelte';
	import AnchorHandle from './AnchorHandle.svelte';

	import {
		annotationWidth,
		getAnchorPoint,
		getBoxEdges,
		invertPoint
	} from '$lib/modules/coordinates.js';
	import { ANCHOR_PRESETS } from '$lib/modules/anchorPresets.js';
	import { drag } from '$lib/modules/drag.js';
	import { hasCmdOrCtrl } from '$lib/modules/modifierKeys.js';

	/** @type {{ d: ResolvedAnnotation }} */
	let { d } = $props();

	/**
	 * Layer Cake configuration
	 */
	const k = getLayerCakeContext();

	/**
	 * Context variables
	 */
	/** @type {ModifyAnnotationFn} */
	const modifyAnnotation = getContext('modifyAnnotation');
	/** @type {Ref<number | null>} */
	const editing = getContext('editing');
	/** @type {Ref<HoverState | null>} */
	const hovering = getContext('hovering');
	/** @type {Ref<boolean>} */
	const moving = getContext('moving');

	// The editor keys its notes by id, so this component is the same note for as long as it lives.
	// svelte-ignore state_referenced_locally
	const id = d.id;

	// A note that goes while it is hovered takes the hover with it. Otherwise the
	// Delete key would still find a hover pointing at it.
	onDestroy(() => {
		if (hovering.value?.annotationId === id) hovering.value = null;
	});

	/**
	 * State variables
	 */
	// The editor holds the id of the one note being edited. This note is editable while that id is its own.
	let isEditable = $derived(editing.value === d.id);
	// While the text is being edited, a press on the box belongs to the text.
	let canDrag = $derived(!isEditable);
	// `hovering` is the ref itself. This is whether it points at this note: its
	// box or one of its arrow handles.
	let hovered = $derived(hovering.value?.annotationId === d.id);
	/** @type {HTMLElement|undefined} The annotation box, measured when the anchor moves. */
	let boxEl = $state();
	// How tall the box is right now, for the arrow handles that ride on its edge.
	// The one dimension the config can't supply: it comes out of how the text
	// wraps, so only the DOM knows it. Editor chrome only: a saved arrow's source
	// is stored, never measured.
	let boxHeight = $state(0);

	/**
	 * Arrow sides - simplified to just west and east
	 * @type {Array<'west' | 'east'>}
	 */
	const arrowSides = ['west', 'east'];

	/**
	 * Coordinates
	 */
	// The anchor point in chart pixels, which is what a drag of the box works in.
	let anchor = $derived(getAnchorPoint(d, k));
	// The box's left edge and width in chart pixels, which is what a resize works in.
	let edges = $derived(getBoxEdges(d, k, anchor));

	/**
	 * Pin the anchor point to a new spot in the chart.
	 * @param {{ x: number, y: number }} pos - Where the anchor point goes, in chart pixels.
	 */
	function ondrag(pos) {
		const point = invertPoint(pos.x, pos.y, k);
		if (point === null) return;

		modifyAnnotation(d.id, { ...point, data: { ...d.data, ...point.data } });
	}

	// A press on the box drags the whole note by its anchor point. `canDrag` is
	// asked again on every move: an edit can open while the button is still down.
	const dragBox = drag({
		moving,
		pointer: k.pointer,
		onstart: () => (canDrag ? anchor : null),
		onmove: (pos) => {
			if (canDrag) ondrag(pos);
		}
	});

	/**
	 * Keep `boxHeight` in step with the box: once when the box lands on the page,
	 * so the arrow handles sit right from the start, and again whenever its size changes.
	 * @type {import('svelte/attachments').Attachment<HTMLElement>}
	 */
	function measureHeight(node) {
		boxHeight = node.offsetHeight;

		const observer = new ResizeObserver(() => {
			boxHeight = node.offsetHeight;
		});
		// `offsetHeight` is the height of the border box, so that is the box to watch.
		observer.observe(node, { box: 'border-box' });

		return () => observer.disconnect();
	}

	// A note is hovered once it has been pointed at: the mouse moved over it, or
	// focus reached it. The browser also reports an enter when the page changes
	// under a mouse that is holding still, like a deleted note uncovering the one
	// beneath it, and that one was never pointed at. A move only comes from the mouse.
	function onpoint() {
		if (moving.value) return;
		if (hovering.value?.annotationId === d.id && hovering.value.type === 'body') return;
		hovering.value = { annotationId: d.id, type: 'body' };
	}
	// leave rather than out: the box has children that take the mouse themselves,
	// like the resize grabbers and the anchor handle, and out counts a move onto a
	// child as leaving the box.
	function onmouseleave() {
		if (moving.value) return;
		hovering.value = null;
	}

	/**
	 * Give the box the left edge and width a resize asks for. The width is stored
	 * in whole pixels. The position is written only when the anchor point has to
	 * move for the left edge to land where it was asked to.
	 * @param {{ left: number, width: number }} box - In chart pixels.
	 */
	function onresize(box) {
		const newWidth = Math.round(box.width);
		const widthChanges = newWidth !== edges.width;
		// The anchor rides at its share of the width. It moves when the left edge
		// does, and when the width changes under an anchor that sits off that edge.
		const anchorMoves = box.left !== edges.left || (d.anchorX !== 0 && widthChanges);
		if (!widthChanges && !anchorMoves) return;

		const stored = { width: `${newWidth}px` };
		if (!anchorMoves) {
			modifyAnnotation(d.id, stored);
			return;
		}

		// Only x moves. The y axis is left out, so its data value stands: without it
		// every scale returns NaN and every path built from one goes unrendered.
		const point = invertPoint(box.left + (d.anchorX / 100) * newWidth, null, k);
		if (point === null) return;

		modifyAnnotation(d.id, { ...point, data: { ...d.data, ...point.data }, ...stored });
	}

	/**
	 * Index of the preset nearest the current anchor.
	 */
	function getCurrentAnchorIndex() {
		let nearest = 0;
		let nearestDistance = Infinity;
		ANCHOR_PRESETS.forEach((pos, i) => {
			const distance = (pos.x - d.anchorX) ** 2 + (pos.y - d.anchorY) ** 2;
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearest = i;
			}
		});
		return nearest;
	}

	/**
	 * Move the anchor point and leave the annotation where it is on screen. The
	 * box hangs off the anchor, so moving the anchor would drag the box along
	 * with it. Shifting dx and dy by the same distance cancels that out.
	 * @param {number} newAnchorX - The new anchor X, 0-100.
	 * @param {number} newAnchorY - The new anchor Y, 0-100.
	 * @param {ReturnType<typeof snapshot>} [from] - Where the move started from. Defaults to where the annotation is now.
	 */
	function setAnchor(newAnchorX, newAnchorY, from) {
		const start = from ?? snapshot();

		const deltaX = ((newAnchorX - start.anchorX) / 100) * annotationWidth(d);
		const deltaY = ((newAnchorY - start.anchorY) / 100) * start.boxHeight;

		// Arrows hang off the anchor point, and the compensation above slides that
		// point down the chart by deltaY. Take the same off each source so the
		// arrows stay where they are.
		const arrows = d.arrows.map((a, i) => ({
			...a,
			source: { dx: a.source.dx, dy: start.sourceDy[i] - deltaY }
		}));

		modifyAnnotation(d.id, {
			anchorX: newAnchorX,
			anchorY: newAnchorY,
			dx: start.dx + (deltaX / k.width) * 100,
			dy: start.dy + (deltaY / k.height) * 100,
			arrows
		});
	}

	/**
	 * Where the annotation and its arrows sit right now. A move measures from one
	 * of these rather than from live values, so a drag can't accumulate drift.
	 */
	function snapshot() {
		return {
			anchorX: d.anchorX,
			anchorY: d.anchorY,
			dx: d.dx,
			dy: d.dy,
			// The one measurement the config can't supply. Taken once per gesture:
			// the box holds still while the anchor moves across it.
			boxHeight: boxEl?.getBoundingClientRect().height ?? 0,
			sourceDy: d.arrows.map((a) => a.source.dy)
		};
	}

	/**
	 * Where the annotation sat when the anchor drag started.
	 * @type {ReturnType<typeof snapshot>|null}
	 */
	let anchorDragStart = null;

	function onclick(e) {
		// Cmd+click (Ctrl+click on Windows and Linux): cycle text alignment, left → center → right → left
		if (hasCmdOrCtrl(e) && !e.altKey) {
			/** @type {Annotation['align']} */
			let newAlignment;
			if (d.align === 'left') {
				newAlignment = 'center';
			} else if (d.align === 'center') {
				newAlignment = 'right';
			} else {
				newAlignment = 'left';
			}
			modifyAnnotation(d.id, { align: newAlignment });
		}
		// Option+click (Alt+click): cycle anchor position
		else if (e.altKey && !hasCmdOrCtrl(e)) {
			const next = ANCHOR_PRESETS[(getCurrentAnchorIndex() + 1) % ANCHOR_PRESETS.length];
			setAnchor(next.x, next.y);
		}
	}
</script>

<AnnotationBox
	{d}
	bind:el={boxEl}
	class={['draggable', { canDrag, hovering: hovered }]}
	{@attach dragBox}
	{@attach measureHeight}
	{onclick}
	onmousemove={onpoint}
	{onmouseleave}
	onfocusin={onpoint}
	onblur={(e) => {
		// Tabbing to the resize grabbers or the anchor handle moves focus to a
		// child, which still counts as leaving this element. Stay hovered so those
		// controls don't vanish as they're reached.
		if (!boxEl?.contains(/** @type {Node | null} */ (e.relatedTarget))) onmouseleave();
	}}
	role="button"
	tabindex={0}
	aria-label="Annotation - drag to move, press Delete to remove"
>
	{#snippet content()}
		<EditableText
			id={d.id}
			text={d.text}
			{isEditable}
			onSave={(newText) => modifyAnnotation(d.id, { text: newText })}
		/>
	{/snippet}

	<ResizeHandles left={edges.left} width={edges.width} {onresize} />
	<AnchorHandle
		id={d.id}
		anchorX={d.anchorX}
		anchorY={d.anchorY}
		{boxEl}
		onDragStart={() => (anchorDragStart = snapshot())}
		onDrag={(x, y) => setAnchor(x, y, anchorDragStart)}
		onDragEnd={() => (anchorDragStart = null)}
	/>
</AnnotationBox>

{#each arrowSides as side (side)}
	<ArrowZone {d} {side} {boxHeight} />
{/each}
