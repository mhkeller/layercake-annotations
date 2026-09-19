/** The text a new note starts with, and what a note left blank is given. */
export const DEFAULT_TEXT = 'New note...';

/**
 * The text to store when an edit ends.
 * @param {string} draft - What the edit box holds.
 * @returns {string}
 */
export function finalText(draft) {
	// An emptied edit box can hold a stray line break.
	const s = draft.replace(/[\r\n]+$/, '');
	if (s === '') return DEFAULT_TEXT;

	// Whitespace-only text is kept as typed: that is how you get an arrow with no label.
	return s.trim() === '' ? s : s.trim();
}
