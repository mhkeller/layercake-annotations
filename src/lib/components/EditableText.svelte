<script>
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';
	import { on } from 'svelte/events';

	import { finalText } from '$lib/modules/noteText.js';
	import { hasCmdOrCtrl } from '$lib/modules/modifierKeys.js';

	/** @type {Ref<number | null>} The id of the note being edited, shared across the editor. */
	const editing = getContext('editing');

	/** @type {{ id: number, text: string, isEditable: boolean, onSave: (text: string) => void }} */
	let { id, text, isEditable, onSave } = $props();

	// What the edit box holds. The note's own text stays as it is until the edit
	// ends, and then changes through `onSave`.
	let draft = $state('');

	function selectAllTextInContentEditable(element) {
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(element);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function startEdit() {
		draft = text;
		editing.value = id;
	}

	/**
	 * Safe to call more than once: only the note being edited has an edit to end.
	 */
	function endEdit() {
		if (editing.value !== id) return;
		editing.value = null;

		// Save the text change
		const final = finalText(draft);
		if (final !== text) onSave(final);
	}

	/**
	 * One edit, from the moment the editing box appears until it goes: take focus
	 * and select what's there, and end the edit on a click anywhere but inside the box.
	 *
	 * Nothing reactive is read in here, so the box is set up once and the selection
	 * is left alone while typing. The listener reads what it needs when a click comes.
	 * @type {import('svelte/attachments').Attachment<HTMLElement>}
	 */
	function editSession(node) {
		node.focus();
		selectAllTextInContentEditable(node);

		const off = on(document, 'click', (e) => {
			if (!node.contains(/** @type {Node} */ (e.target))) node.blur();
		});

		return () => {
			off();
			// Firefox and Safari send no blur when a focused element is removed.
			endEdit();
		};
	}

	/** @param {KeyboardEvent & { currentTarget: HTMLElement }} e */
	function onkeydown(e) {
		// While an IME is composing, Enter picks a candidate. keyCode 229 is how
		// some browsers mark those keys.
		if (e.isComposing || e.keyCode === 229) return;

		if (e.key === 'Escape' || e.key === 'Tab') {
			e.currentTarget.blur();
		}
		// Enter without shift saves, shift+enter allows line break
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			e.currentTarget.blur();
		}
	}

	/** @param {MouseEvent} e */
	function ondblclick(e) {
		// Don't enter edit mode if Cmd or Ctrl is held (alignment cycling) or Option is held (anchor cycling)
		if (hasCmdOrCtrl(e) || e.altKey) return;
		startEdit();
	}

	/** @param {KeyboardEvent} e */
	function onDisplayKeydown(e) {
		if (e.key !== 'Enter') return;

		// Without this the same Enter carries on into the editing box, which by then
		// has focus and all its text selected, and replaces the text with a line break.
		e.preventDefault();
		startEdit();
	}

	// A click in the edit box belongs to the text, so the note's click shortcuts don't hear it.
	/** @param {MouseEvent} e */
	function onclick(e) {
		e.stopPropagation();
	}
</script>

{#if isEditable}
	<div
		class="textarea"
		role="textbox"
		aria-multiline="true"
		tabindex="0"
		{@attach editSession}
		onblur={endEdit}
		{onkeydown}
		{onclick}
		contenteditable
		bind:innerText={draft}
	></div>
{:else}
	<div
		class="text-display"
		{ondblclick}
		onkeydown={onDisplayKeydown}
		role="button"
		tabindex="0"
		aria-label="Double-click or press Enter to edit"
	>
		<pre>{text}</pre>
	</div>
{/if}

<style>
	.textarea[contenteditable] {
		outline: none;
		position: relative;
		white-space: pre-wrap;
	}
	.textarea[contenteditable]:after {
		position: absolute;
		content: '';
		top: -2px;
		right: -4px;
		bottom: -2px;
		left: -4px;
		pointer-events: none;
		border-radius: 3px;
		border: 2px solid #007bff;
		box-shadow: 0 0 5px #007bff50;
	}
</style>
