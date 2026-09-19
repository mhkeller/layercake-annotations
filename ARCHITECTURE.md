# Architecture

This document explains the internal architecture and design decisions of LayerCake Annotations.

## Overview

LayerCake Annotations adds interactive text annotations with swoopy arrows to LayerCake charts. It supports both **edit mode** (interactive) and **static mode** (read-only).

## Component Hierarchy

```
Annotations.svelte          # Entry point - switches based on `editable` prop
├── Editor.svelte           # Edit mode: state management, context providers
│   ├── Arrows.svelte       # SVG arrow rendering
│   └── AnnotationEditor.svelte (×N)
│       ├── Draggable.svelte
│       │   ├── EditableText.svelte
│       │   ├── ResizeHandles.svelte
│       │   └── AnchorHandle.svelte   # drag the anchor point
│       └── ArrowZone.svelte (×2: west, east)
│
└── Static.svelte           # Read-only mode
    ├── Arrows.svelte
    └── AnnotationsData.svelte
```

## The measurement rule

> The box's measured height may be read in the editor, at the moment a gesture turns into stored numbers. It may never be read by code that draws a saved arrow.

An annotation has exactly one point whose position is knowable from its config: the anchor point. Its width is stored, so the left and right edges are knowable too. Its height is not — it comes out of how the text wraps — so nothing else vertical can be worked out without measuring the page.

That is why `source.dx` is pixels from the near edge while `source.dy` is pixels down from the anchor point. The asymmetry is the rule showing through, and it is what lets a published chart draw its arrows without measuring anything.

To put an arrow at the middle or bottom of the box, move the anchor there with `anchorY` and leave `source.dy` at 0. The browser resolves `anchorY` against the real box, so that survives the text re-wrapping.

Grep for `getBoundingClientRect` to check the rule still holds. Every hit should be in `Draggable`, `ResizeHandles`, `AnchorHandle` or `AnnotationEditor`'s `snapshot` — all of which run while the user is dragging something. A hit in `Arrows.svelte` or `AnnotationsData.svelte` means the rule has been broken, and published charts will be wrong in a way the screenshot tests won't show.

One measurement runs outside a gesture: `Draggable` reports the box's height through `bind:offsetHeight`, so the handle that starts a new arrow can sit at the middle of the box's edge rather than at the anchor. The arrow that handle creates stores its own `source.dy`, so nothing measured here reaches a saved arrow. The dimension bindings count as measurement too, so grep for `bind:offset` and `bind:client` as well — a hit outside `Draggable` means the rule has slipped.

## Coordinate Systems

The library juggles three coordinate systems:

| System                 | Used For                               | Example                                       |
| ---------------------- | -------------------------------------- | --------------------------------------------- |
| **Data space**         | Storing annotation/arrow positions     | `{ date: new Date('2024-01-15'), value: 42 }` |
| **Percentage offsets** | Fine-tuning position relative to chart | `dx: 5` = 5% of chart width                   |
| **Pixels**             | Rendering, drag interactions           | `sourceX: 150, sourceY: 200`                  |

### Annotation Position

```
Final pixel position = toPixels(scale(dataValue)) + (percentage / 100) × chartDimension
```

`getAnchorPoint` in `coordinates.js` is the only place that computes this, and both the editor and the static renderer set `left`/`top` from it. That matters because a chart with `percentRange` has scales whose ranges run 0-100 while everything drawn from them is in pixels — the SVG layer arrows live in carries no viewBox — so the scale's output has to be converted before the percentage offsets are added. A second implementation of this expression is how the two modes drift apart.

The one position still left to CSS is `translate: -anchorX% -anchorY%`. That percentage is a share of the box's own height, which nothing can measure ahead of time, so the browser has to resolve it. Every other percentage here resolves against the chart, whose size JS already knows.

### Arrow Coordinates

- **Source**: `dx` is pixels from the near edge of the annotation, `dy` is pixels down from the anchor point. See the measurement rule above for why the two differ.
- **Target**: Stored in data space with optional percentage offsets (for ordinal scales)

## State Management

### Context-based State

Edit mode shares state via Svelte context using reactive refs:

```javascript
// Editor.svelte creates refs
const hovering = createRef(null);
setContext('hovering', hovering);

// Child components read/write
const hovering = getContext('hovering');
hovering.value = { annotationId: 0, type: 'arrow' };
```

### Context Values

| Key                | Type                 | Purpose                                  |
| ------------------ | -------------------- | ---------------------------------------- |
| `hovering`         | `HoverState \| null` | Which element is hovered (shows handles) |
| `moving`           | `boolean`            | Whether a drag is in progress            |
| `isEditing`        | `boolean`            | Whether text is being edited             |
| `previewArrow`     | `DragState \| null`  | Live arrow coordinates during drag       |
| `modifyAnnotation` | `function`           | Update annotation properties             |
| `setArrow`         | `function`           | Create or update an arrow                |
| `modifyArrow`      | `function`           | Modify specific arrow properties         |

### Reading the Layer Cake context

`getLayerCakeContext()` returns an object whose fields are getters. Don't destructure it at the top of a component: that reads each getter once, so the chart draws its first frame and then ignores every resize. Read `k.xScale` where it's used, or inside `$derived`.

## Design Decisions

### Why `previewArrow` instead of directly modifying arrows?

**Problem**: During drag, we need smooth 60fps updates. Arrow data is stored in data space, but dragging operates in pixels.

**Solution**: Use separate ephemeral state for the drag preview.

```
User drags handle
    ↓
Update previewArrow (pixel coordinates) ← fast, every frame
    ↓
Arrows.svelte renders dragPath from previewArrow
    ↓
User releases mouse
    ↓
Convert pixels → data space → call setArrow() ← expensive, once
    ↓
Clear previewArrow → normal rendering resumes
```

**Benefits**:

1. **Performance**: No coordinate conversions during drag
2. **New arrows**: Can render arrow before it exists in data
3. **Clean rendering**: Hide saved arrow while preview renders (no double-render)
4. **Atomic commits**: Only persist on mouse release

### Why percentage offsets instead of pure data coordinates?

Annotations often need to be positioned _near_ a data point but not exactly on it (to avoid overlapping the chart line). Percentage offsets allow:

- Consistent visual offset regardless of scale domain
- Easy manual adjustment (`dx: 5` = "5% to the right")
- Works with both linear and ordinal scales

### Why separate Editor and Static components?

1. **Bundle size**: Static mode doesn't need drag handlers, context, etc.
2. **Simplicity**: Static rendering is just a loop with positioning
3. **Security**: No edit functionality exposed in read-only mode

### One anchor point, shared

The anchor point does two jobs: it pins the annotation to its data point, and arrows hang off it. There is one per annotation. So an annotation pinned by its top-left corner, with an arrow leaving from the middle of its right edge, can't be drawn without measuring the box. That is the one layout this design gives up.

Don't work around it with a percentage such as `source: { dy: '50%' }`. Half the box's height needs the height, which the measurement rule keeps out of drawing. It would either break the rule, or be worked out once and stop following the text as it re-wraps.

### Designs considered and rejected

| Design                                                  | Why not                                                                                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Measuring `dx` from the anchor as well as `dy`          | Gains nothing. Width is in the config, so the edges are already known                                                                                           |
| A registry of measured boxes                            | The only design that stays right through every re-wrap, but it needs measuring machinery for good, and moving `<Arrows>` out of `Editor` loses the drag preview |
| Arrows drawn inside each annotation                     | A zero-size wrapper becomes the box's containing block, and `percentRange` stops working                                                                        |
| Pure CSS anchoring                                      | `d: shape()` isn't in any browser yet, WebKit doesn't support `d: path()`, and browsers disagree about `anchor()` once the anchored element has a transform     |
| Storing a measured height                               | A cached layout result. It depends on width, text, font and browser, and goes stale with nothing to say so                                                      |
| A height the author sets, with a vertical resize handle | Not stale, since it's an input like `width`. But text is edited in place, so a fixed height would clip it while typing                                          |

### Deliberately not done

- **More than two arrows per annotation.** An arrow is looked up by its `side`, so an annotation has at most one west arrow and one east arrow. Changing that changes the data model, and is worth doing the day a third arrow is wanted.
- **Rules for styling `.layercake-annotation`.** Arrows attach to the edges of the box around it, so margin, padding or a transform on it can move the text away from where the arrows meet it. Nothing documents or prevents that yet. It needs a real stylesheet to design against.
- **A clickable arrow line.** The layer that turns clicks into new annotations covers the whole chart. Giving arrows their own click area would leave a strip along every arrow where clicking no longer makes an annotation, so arrows are edited through their handles.

## Key Modules

### `coordinates.js`

Centralizes all position calculations to prevent drift between components:

```
getAnchorPoint(anno, k)        // The one point knowable from config alone
getBoxEdges(anno, k)           // left, right, width - deliberately no top or bottom
getArrowSource(anno, arrow, k) // Where an arrow leaves its annotation
getArrowTarget(arrow, k)       // Where it points
annotationWidth(anno)          // The one width predicate and the one default
resolveArrowSource(arrow)      // A source's offsets, defaults filled in
calculateSourceDx(pixelX, anno, side, k) // Pixel → stored offset
calculateSourceDy(pixelY, anno, k)
```

Every one of these is a pure function of the config and the scales. None takes a measured dimension, which is what keeps published charts correct without a measurement pass.

### `invertScale.js`

Converts positions back to data values. Handles both linear and ordinal scales:

```javascript
const [dataValue, percentOffset] = invertScale(scale, pos, size, percentRange);
// For linear: percentOffset is always 0
// For ordinal: percentOffset is position within the band (0-100)
```

`size` and `percentRange` are required because a chart with `percentRange` set has scales whose ranges run 0-100, while positions come off the page in pixels. Inverting a pixel against a percentage range doesn't throw, it just puts the annotation somewhere else.

### `arrowUtils.js`

Generates SVG arc paths:

```
createArrowPath(source, target, clockwise, angle)
// Returns: "M 100,50 a 75,75 0 0,1 100,50"
```

## Data Flow

### Creating an annotation

```
Click on chart
    ↓
addAnnotation() builds it with newAnnotation()
    ↓
Push to annotations array (reactive)
    ↓
AnnotationEditor renders at click position
    ↓
saveConfig_debounced() saves it a second later
```

### Creating an arrow

```
Hover annotation → ArrowZone handles appear
    ↓
Drag handle → onTargetPointerdown() captures the pointer
    ↓
pointermove updates previewArrow (pixels)
    ↓
Arrows.svelte renders dragPath
    ↓
pointerup → convert to data space → setArrow()
    ↓
Clear previewArrow, arrow now in annotation.arrows
```

### Toggling arrow curve direction

```
Cmd+click on an arrow handle
    ↓
Cycle: clockwise → null (straight) → counter-clockwise
    ↓
modifyArrow(id, side, { clockwise: newValue })
    ↓
Arrow re-renders with new curve
```

## Testing

Three layers, because screenshots alone can't catch a misplaced arrow:

- `tests/unit/` - the pure geometry, run under node
- `tests/geometry.test.js` - where arrows and handles sit at non-zero anchors, and when handles show
- `tests/annotations.test.js` - screenshots, linear and ordinal charts

The screenshots alone can't catch arrow misplacement: every scenario they cover sits at `anchorY` 0, where the anchor term drops out and wrong maths still looks right. That is what `tests/geometry.test.js` is for.

Run with:

```bash
pnpm test                                    # Run tests
pnpm exec playwright test --update-snapshots # Update baselines
```
