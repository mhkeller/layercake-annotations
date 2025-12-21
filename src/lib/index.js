export { default as Annotations } from './Annotations.svelte';
export { default as AnnotationsEditor } from './Editor.svelte';
export { default as AnnotationsStatic } from './Static.svelte';

// Re-export types for consumers
/**
 * @typedef {import('./types.js').Annotation} Annotation
 * @typedef {import('./types.js').Arrow} Arrow
 * @typedef {import('./types.js').ArrowSource} ArrowSource
 * @typedef {import('./types.js').ArrowTarget} ArrowTarget
 */
