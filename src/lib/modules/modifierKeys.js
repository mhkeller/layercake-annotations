/**
 * Whether the shortcut key is held: Cmd on macOS, Ctrl on Windows and Linux.
 * @param {{ metaKey: boolean, ctrlKey: boolean }} e - A mouse or keyboard event.
 * @returns {boolean}
 */
export function hasCmdOrCtrl(e) {
	return e.metaKey || e.ctrlKey;
}
