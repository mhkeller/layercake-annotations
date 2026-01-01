## Breaking Change

Annotation and arrow target data values are now nested under a `data` property to prevent field name collisions with library internal fields like `id`, `dx`, `dy`, `text`, etc.

### Before

```javascript
// Annotation
{ id: 0, myX: 1995, myY: 5, dx: 0, dy: 0, text: '...', arrows: [...] }

// Arrow target
{ target: { myX: 2010, myY: 4.5, dx: 0, dy: 0 } }
```

### After

```javascript
// Annotation
{ id: 0, data: { myX: 1995, myY: 5 }, dx: 0, dy: 0, text: '...', arrows: [...] }

// Arrow target
{ target: { data: { myX: 2010, myY: 4.5 }, dx: 0, dy: 0 } }
```

### Why

This prevents issues when user datasets have fields named `id`, `dx`, `dy`, `text`, `width`, `arrows`, etc. that would collide with the annotation library's internal fields.

### Changes

- Updated `Annotation` and `ArrowTarget` interfaces in `types.d.ts`
- Updated coordinate utilities to read from `.data` property
- Updated components (`AnnotationsData.svelte`, `AnnotationEditor.svelte`, `ArrowZone.svelte`)
- Updated `newAnnotation.js` factory
- Updated demo page data structures
- Updated README documentation

