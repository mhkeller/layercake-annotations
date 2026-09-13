<script>
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';

	/** @type {Ref<boolean>} */
	const isEditing = getContext('isEditing');

	let { text = $bindable(), isEditable = $bindable(false), alignment, onSave } = $props();

	/** @type {HTMLElement|null} The editing box, while there is one. */
	let textarea = $state(null);

	function selectAllTextInContentEditable(element) {
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(element);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function endEdit() {
		isEditable = false;
		text = text.trim();

		// Save the text change
		onSave?.(text);

		// Wait for the click event to propagate before setting isEditing to false
		setTimeout(() => {
			isEditing.value = false;
		}, 200);
	}

	/**
	 * Take focus and select what's there, the moment the editing box appears.
	 * @type {import('svelte/attachments').Attachment<HTMLElement>}
	 */
	function takeFocus(node) {
		node.focus();
		selectAllTextInContentEditable(node);
	}

	/** @param {KeyboardEvent} e */
	function onkeydown(e) {
		if (!isEditable || !textarea) return;

		if (e.key === 'Escape' || e.key === 'Tab') {
			textarea.blur();
		}
		// Enter without shift saves, shift+enter allows line break
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			textarea.blur();
		}
	}

	/**
	 * A click anywhere but inside the box ends the edit.
	 * @param {MouseEvent} e
	 */
	function onclickoutside(e) {
		if (!isEditable || !textarea) return;
		if (!textarea.contains(/** @type {Node} */ (e.target))) textarea.blur();
	}

	function handleDoubleClick(e) {
		// Don't enter edit mode if Cmd is held (alignment cycling) or Option is held (anchor cycling)
		if (e?.metaKey || e?.altKey) return;
		isEditable = true;
		isEditing.value = true;
	}
	function onclick(e) {
		if (isEditable) {
			e.stopPropagation();
			// If we are inside a contenteditable element, don't propagate the click event
			e.preventDefault();
			return false;
		}
	}
</script>

{#if isEditable}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="textarea"
		role="textbox"
		aria-multiline="true"
		tabindex="0"
		bind:this={textarea}
		{@attach takeFocus}
		onblur={endEdit}
		{onclick}
		ondblclick={handleDoubleClick}
		contenteditable
		bind:innerText={text}
		style:text-align={alignment}
	></div>
{:else}
	<div
		class="text-display"
		ondblclick={handleDoubleClick}
		onkeydown={(e) => e.key === 'Enter' && handleDoubleClick()}
		role="button"
		tabindex="0"
		aria-label="Double-click or press Enter to edit"
		style:text-align={alignment}
	>
		<pre>{text}</pre>
	</div>
{/if}

<svelte:window {onkeydown} />
<svelte:document onclick={onclickoutside} />

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
	pre {
		margin: 0;
		font-family: inherit;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>
