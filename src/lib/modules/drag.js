import { on } from 'svelte/events';

/** How far the pointer travels from the press, in client pixels, before the press counts as a drag. */
const DRAG_DISTANCE_PX = 3;

/**
 * @param {PointerEvent} e
 * @returns {[number, number]}
 */
function clientPointer(e) {
	return [e.clientX, e.clientY];
}

/**
 * One press-move-release, as a Svelte attachment. Every drag in the editor goes
 * through here, so they all start, track and end the same way.
 *
 * What consumers can build on: if `onstart` returns an origin, `onend` is called
 * exactly once. That holds however the drag ends: a release, a cancel, a context
 * menu, or the element leaving the page mid-press.
 *
 * Make the attachment once in `<script>` and use it with `{@attach}`. Neither
 * this function nor the attachment reads reactive state, so Svelte keeps the same
 * attachment for the life of the element. The callbacks read what they need when
 * they are called.
 *
 * @param {Object} opts
 * @param {{ value: boolean }} opts.moving  The editor's shared "a drag is under way" ref. Required.
 *   It is also the lock: one drag at a time per editor.
 * @param {(e: PointerEvent) => [number, number]} [opts.pointer]  Where the pointer is, in the space the
 *   consumer works in. Defaults to client coordinates. Pass Layer Cake's `k.pointer` to work in chart pixels.
 * @param {(e: PointerEvent) => ({ x: number, y: number } | null | undefined)} opts.onstart
 *   Runs on a primary-button press. Returns where the dragged thing sits right now (same space as `pointer`),
 *   or nothing to decline the drag.
 * @param {(pos: { x: number, y: number }, e: PointerEvent) => void} [opts.onmove]
 *   Where the dragged thing should sit now: the pointer minus the grab offset remembered at the press.
 * @param {(result: { moved: boolean, cancelled: boolean }) => void} [opts.onend]
 *   `moved` says whether the pointer travelled far enough to count as a drag. `cancelled` is true for
 *   every ending but a release.
 * @returns {import('svelte/attachments').Attachment<HTMLElement>}
 */
export function drag({ moving, pointer = clientPointer, onstart, onmove, onend }) {
	return (node) => {
		// Everything about the press in progress lives in here, one copy per
		// element: the same attachment can sit on more than one element.
		let active = false;
		let pointerId = -1;
		let pointerType = '';
		// The gap between the pointer and the dragged thing, so it doesn't jump
		// under the cursor on the first move.
		let grabX = 0;
		let grabY = 0;
		// Where the press landed, in client pixels.
		let pressX = 0;
		let pressY = 0;
		let moved = false;
		/** @type {Array<() => void>} */
		let offWindow = [];

		/** @param {PointerEvent} e */
		function onpointerdown(e) {
			if (e.button !== 0 || !e.isPrimary) return;

			// A handle inside the box hears the press first, on its way up, and takes
			// the lock. The box hears it next and stands down.
			if (moving.value) return;

			// NaN until Layer Cake's container mounts.
			const [px, py] = pointer(e);
			if (!Number.isFinite(px) || !Number.isFinite(py)) return;

			const origin = onstart(e);
			if (!origin) return;
			if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
				onend?.({ moved: false, cancelled: true });
				return;
			}

			// From here to the end of the function nothing returns early, so a drag
			// that starts is always one that `end` can finish.
			active = true;
			pointerId = e.pointerId;
			pointerType = e.pointerType;
			grabX = px - origin.x;
			grabY = py - origin.y;
			pressX = e.clientX;
			pressY = e.clientY;
			moved = false;

			// On the window and in the capture phase, so the ending is heard wherever
			// the pointer is and whatever else handles it.
			offWindow = [
				on(window, 'pointerup', onrelease, { capture: true }),
				on(window, 'pointercancel', onrelease, { capture: true }),
				on(window, 'contextmenu', oncontextmenu, { capture: true })
			];

			moving.value = true;

			// Capture keeps the moves coming however far the pointer travels. It goes
			// on whatever was pressed rather than on the node, so a double click on the
			// text inside still reports against the text.
			try {
				/** @type {Element} */ (e.target).setPointerCapture(e.pointerId);
			} catch {
				// A drag without capture is still ended by the window listeners.
			}
		}

		/**
		 * Moves reach the node by bubbling from the captured element. So do the
		 * moves of a handle inside the node, under the same pointer id, which is why
		 * this drag has to be the active one.
		 * @param {PointerEvent} e
		 */
		function onpointermove(e) {
			if (!active || e.pointerId !== pointerId) return;

			// Absolute, rather than summing movementX: that drifts under page zoom and
			// loses a frame's motion whenever the pointer leaves the window.
			const [px, py] = pointer(e);
			if (!Number.isFinite(px) || !Number.isFinite(py)) return;

			// A press that barely moves is a click. Once it has moved enough it stays
			// a drag, even if the pointer comes back to where it started.
			if (!moved) {
				if (Math.hypot(e.clientX - pressX, e.clientY - pressY) < DRAG_DISTANCE_PX) return;
				moved = true;
			}

			onmove?.({ x: px - grabX, y: py - grabY }, e);
		}

		/** @param {PointerEvent} e */
		function onrelease(e) {
			if (!active || e.pointerId !== pointerId) return;
			end(e.type !== 'pointerup');
		}

		/** @param {PointerEvent} e */
		function onlostpointercapture(e) {
			if (!active || e.pointerId !== pointerId) return;
			end(true);
		}

		/**
		 * A context menu swallows the release that would have ended a mouse drag. A
		 * long press on a touch screen fires contextmenu too, with the finger still
		 * down and the drag still going, so only a mouse's menu counts.
		 * @param {MouseEvent & { pointerId?: number }} e
		 */
		function oncontextmenu(e) {
			if (!active || pointerType !== 'mouse') return;
			// Some browsers send contextmenu as a plain MouseEvent, with no pointer id to compare.
			if (e.pointerId !== undefined && e.pointerId !== pointerId) return;
			end(true);
		}

		/**
		 * Safe to call more than once. `moving` is cleared before `onend` runs, so a
		 * consumer that throws while saving can't leave the editor locked.
		 * @param {boolean} cancelled
		 */
		function end(cancelled) {
			if (!active) return;
			active = false;
			for (const off of offWindow) off();
			offWindow = [];
			moving.value = false;
			onend?.({ moved, cancelled });
		}

		const offNode = [
			on(node, 'pointerdown', onpointerdown),
			on(node, 'pointermove', onpointermove),
			on(node, 'lostpointercapture', onlostpointercapture)
		];

		// The element left the page, perhaps mid-press: its note was deleted, or its
		// component destroyed.
		return () => {
			for (const off of offNode) off();
			end(true);
		};
	};
}
