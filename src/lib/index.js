export { default as Annotations } from './Annotations.svelte';
export { default as AnnotationsEditor } from './AnnotationsEditor.svelte';
export { default as AnnotationsEditorPlain } from './Editor.svelte';
export { default as AnnotationsStatic } from './Static.svelte';

// The config as JavaScript text, as the Copy button and `onsave` give it, for a
// page that brings its own UI.
export { default as serializeAnnotations } from './modules/serializeAnnotations.js';

// An `onsave` that writes the config into a file, with the plugin from `/vite`.
export { default as saveTo } from './modules/saveTo.js';

// Re-export types for consumers
/**
 * @typedef {import('./types.js').Annotation} Annotation
 * @typedef {import('./types.js').Arrow} Arrow
 * @typedef {import('./types.js').ArrowSource} ArrowSource
 * @typedef {import('./types.js').ArrowTarget} ArrowTarget
 * @typedef {import('./types.js').OnSaveFn} OnSaveFn
 * @typedef {import('./types.js').SaveAnnotationConfigFn} SaveAnnotationConfigFn
 * @typedef {import('./types.js').AnnotationsProps} AnnotationsProps
 * @typedef {import('./types.js').AnnotationsEditorProps} AnnotationsEditorProps
 * @typedef {import('./types.js').AnnotationsEditorPlainProps} AnnotationsEditorPlainProps
 * @typedef {import('./types.js').AnnotationsStaticProps} AnnotationsStaticProps
 */
