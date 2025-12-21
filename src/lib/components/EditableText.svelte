<script>
	/**
	 * @template T
	 * @typedef {import('../types.js').Ref<T>} Ref
	 */

	import { getContext } from 'svelte';

	/** @type {Ref<boolean>} */
	const isEditing = getContext('isEditing');

	let { text = $bindable(), isEditable = $bindable(false), alignment } = $props();

	let textarea = $state(null);

	function selectAllTextInContentEditable(element) {
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(element);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function cancelEdit() {
		isEditable = false;
		text = text.trim();
		window.removeEventListener('keydown', handleKeydown);
		document.removeEventListener('click', handleClickOutside);

		// Wait for the click event to propagate before setting isEditing to false
		setTimeout(() => {
			isEditing.value = false;
		}, 200);
	}

	function handleClickOutside(event) {
		if (isEditable && textarea && !textarea.contains(event.target)) {
			textarea.blur();
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Return') {
			textarea.blur();
		}
	}

	$effect(() => {
		if (textarea && isEditable) {
			textarea.focus();
			selectAllTextInContentEditable(textarea);
			window.addEventListener('keydown', handleKeydown);
		}
	});

	function handleDoubleClick() {
		isEditable = true;
		isEditing.value = true;
		document.addEventListener('click', handleClickOutside);
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
	<div
		class="textarea"
		role="textbox"
		aria-multiline="true"
		tabindex="0"
		bind:this={textarea}
		onblur={cancelEdit}
		{onclick}
		ondblclick={handleDoubleClick}
		contenteditable
		bind:innerText={text}
		style:text-align={alignment}
	></div>
{:else}
	<div
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

<style>
	.textarea[contenteditable] {
		outline: none; /* Remove default outline */
		position: relative;
	}
	.textarea[contenteditable]:after {
		position: absolute;
		content: ' ';
		top: -2px;
		right: -4px;
		bottom: -2px;
		left: -4px;
		pointer-events: none;
		border-radius: 3px;
		border: 2px solid #007bff; /* Add a custom border */
		box-shadow: 0 0 5px #007bff50; /* Add a subtle shadow */
	}
	pre {
		margin: 0;
		padding: 0;
		font-family: unset;
		white-space: normal;
		pointer-events: none;
	}
</style>
