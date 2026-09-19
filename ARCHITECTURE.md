# Architecture

This document explains the internal architecture and design decisions of LayerCake Annotations.

## Overview

LayerCake Annotations adds interactive text annotations with swoopy arrows to LayerCake charts. It supports both **edit mode** (interactive) and **static mode** (read-only).

## Component Hierarchy

```
Annotations.svelte          # Entry point - switches based on `editable` prop
├── Editor.svelte           # Edit mode: state management, context providers
│   ├── ArrowheadMarker.svelte        # the arrowhead, in the SVG layer's defs
│   ├── Arrows.svelte                 # SVG arrow rendering
│   └── AnnotationEditor.svelte (×N)
│       ├── AnnotationBox.svelte      # the positioned box
│       │   ├── EditableText.svelte   # stands in for the plain text
│       │   ├── ResizeHandles.svelte
│       │   └── AnchorHandle.svelte   # drag the anchor point
│       └── ArrowZone.svelte (×2: west, east)
│
└── Static.svelte           # Read-only mode
    ├── ArrowheadMarker.svelte
    ├── Arrows.svelte
    └── AnnotationBox.svelte (×N)     # the same box, holding plain text
```

`AnnotationBox` draws the positioned box in both modes: `left` and `top` from `getAnchorPoint`, the width from `annotationWidth`, the `translate` that hangs the box off its anchor, and the `.layercake-annotation` div that carries the annotation's own `class` and `style`. With nothing passed in, it shows the text in a `<pre>`. The editor passes `EditableText` as its `content` snippet and the handles as its children, and every other attribute it is given lands on the box itself: event handlers, ARIA and attachments. The box sits straight in the `.layercake-annotations` div in both modes, with no element wrapped around it, because a zero-size wrapper would become its containing block.

The CSS that only the editor needs, which is the red hover border, the move cursor and `touch-action: none`, lives in `Editor.svelte` under its `.layercake-annotations :global(...)` rules rather than in `AnnotationBox`. A published chart has to keep scrolling under a finger.

## The measurement rule

> The box's measured height may be read in the editor, at the moment a gesture turns into stored numbers. It may never be read by code that draws a saved arrow.

An annotation has exactly one point whose position is knowable from its config: the anchor point. Its width is stored, so the left and right edges are knowable too. Its height is not — it comes out of how the text wraps — so nothing else vertical can be worked out without measuring the page.

That is why `source.dx` is pixels from the near edge while `source.dy` is pixels down from the anchor point. The asymmetry is the rule showing through, and it is what lets a published chart draw its arrows without measuring anything.

To put an arrow at the middle or bottom of the box, move the anchor there with `anchorY` and leave `source.dy` at 0. The browser resolves `anchorY` against the real box, so that survives the text re-wrapping.

Grep for `getBoundingClientRect` to check the rule still holds. Every hit should be in `AnchorHandle`, which measures the box and the diamond when an anchor drag starts, or in `AnnotationEditor`'s `snapshot`, which measures the box's height when the anchor is about to move. Both run at the start of a gesture. Dragging the box or a resize handle measures nothing: the pointer and the config are enough. A hit in `Arrows.svelte`, `AnnotationBox.svelte`, `Static.svelte` or `coordinates.js` means the rule has been broken, and published charts will be wrong in a way the screenshot tests won't show.

One measurement runs outside a gesture: `AnnotationEditor`'s `measureHeight` attachment reports the box's `offsetHeight`, once when the box lands on the page and again from a `ResizeObserver` whenever its size changes, so the handle that starts a new arrow can sit at the middle of the box's edge rather than at the anchor. The arrow that handle creates stores its own `source.dy`, so nothing measured here reaches a saved arrow. Grep for `offsetHeight` and `ResizeObserver` as well: a hit outside `measureHeight` means the rule has slipped. Svelte's dimension bindings count as measurement too, so grep for `bind:offset` and `bind:client`, which should find nothing.

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

`getAnchorPoint` in `coordinates.js` is the only place that computes this, and `AnnotationBox` sets `left`/`top` from it in both modes. That matters because a chart with `percentRange` has scales whose ranges run 0-100 while everything drawn from them is in pixels — the SVG layer arrows live in carries no viewBox — so the scale's output has to be converted before the percentage offsets are added. A second implementation of this expression is how the two modes drift apart.

`invertPoint` is the way back: it turns a pixel position into the `data`, `dx` and `dy` to store. A new annotation, a dragged box, a resize that moves the anchor and a dragged arrow target all go through it. It needs to know which keys of `data` to write, which `dataKeys` reads from the chart's `x` and `y` accessors. When those aren't keys, `invertPoint` returns null and the caller skips the write.

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

`Editor.svelte` sets all of these. The first four are refs, read and written through `.value`.

| Key                | Type                 | Purpose                                                          |
| ------------------ | -------------------- | ---------------------------------------------------------------- |
| `editing`          | `number \| null`     | The id of the note whose text is being edited                    |
| `hovering`         | `HoverState \| null` | Which element is hovered (shows handles)                         |
| `moving`           | `boolean`            | Whether a drag is in progress. Also the lock: one drag at a time |
| `previewArrow`     | `DragState \| null`  | Live arrow coordinates during drag                               |
| `modifyAnnotation` | `function`           | Update annotation properties                                     |
| `setArrow`         | `function`           | Create or update an arrow                                        |
| `modifyArrow`      | `function`           | Modify specific arrow properties                                 |

Who writes what:

- `editing` is set by `EditableText` when an edit starts and cleared when it ends. `AnnotationEditor` turns it into one flag, `isEditable = editing.value === d.id`, and passes that down as a plain prop. The layer that adds notes reads it too: a click that ended an edit adds nothing.
- `hovering` is set by `AnnotationEditor` for the box and by `ArrowZone` for its handles. `Editor` clears it after a delete, and an `AnnotationEditor` that is destroyed while hovered clears it on the way out, so the Delete key never finds a hover pointing at a note that is gone.
- `moving` is written only by `drag.js`. Hover handlers do nothing while it is true, so the hover holds for the whole drag.

`Editor` also reads one key it doesn't set: `saveAnnotationConfig`, a save function an app can put in context above the chart. See Saving below.

### Writes go by id

Every change to the config goes through a function in `Editor.svelte`, which works on the bound `annotations` array: `addAnnotation`, `deleteAnnotation`, `modifyAnnotation`, and for arrows `setArrow`, `modifyArrow` and `deleteArrow`. The three arrow functions are one-liners over `updateArrows(id, fn)`, which replaces an annotation's `arrows` with what `fn` makes of them. An annotation has at most one arrow per side, so `setArrow` replaces the arrow on that side where it sits, or adds it.

A new note's id is the next one up from the ids in the array at that moment, so it stays unique when the parent swaps the whole array.

### Saving

Every one of those writes ends in `save()`, which waits until a second has passed with no further writes. When it fires it takes `$state.snapshot(annos)`, a plain copy rather than the live state, and hands it to the first of these that exists: the `onsave` prop, the `saveAnnotationConfig` function from context, or `logConfig`, which logs the config to the console as JSON. `Editor` runs a waiting save straight away when it is destroyed, which is what happens when `editable` goes false.

### Reading the Layer Cake context

`getLayerCakeContext()` returns an object whose fields are getters. Don't destructure it at the top of a component: that reads each getter once, so the chart draws its first frame and then ignores every resize. Read `k.xScale` where it's used, or inside `$derived`.

## Defaults are filled in once

A config can leave out most fields. `resolveAnnotation` and `resolveArrow` in `coordinates.js` fill every default in:

| Field                    | Default                                                                         |
| ------------------------ | ------------------------------------------------------------------------------- |
| `dx`, `dy`               | `0`                                                                             |
| `anchorX`, `anchorY`     | `0`                                                                             |
| `align`                  | `'left'`                                                                        |
| `text`                   | `''`                                                                            |
| `arrows`                 | `[]`                                                                            |
| `arrow.clockwise`        | `true`. `null` is a real value: a straight line                                 |
| `arrow.source.dx`        | `HANDLE_OFFSET_PX` out from the near edge: 12 on the east side, -12 on the west |
| `arrow.source.dy`        | `0`, level with the anchor point                                                |
| `arrow.target.dx`, `.dy` | `0`                                                                             |

There are two ways in, and each resolves once: `Editor.svelte` and `Static.svelte` both hold `let resolved = $derived(annotations.map(resolveAnnotation))` and pass `resolved` down. Everything below them, from `AnnotationBox` and `Arrows` to `AnnotationEditor`, `ArrowZone` and the geometry in `coordinates.js`, reads plain values and never writes `??` for a config default. The types hold the line: those components and functions take `ResolvedAnnotation` and `ResolvedArrow`, so `pnpm check` flags a raw config handed to them.

Width is the exception. It is stored as a CSS string like `"120px"`, so `annotationWidth(anno)` parses it where it is used and supplies the one default, 155 pixels.

Reads come down resolved and writes go back up by id, into the raw array (see Writes go by id). Two things follow:

- **An edit may write a default out in full.** `setAnchor` rebuilds the arrows from resolved ones, and a re-pointed arrow keeps its resolved `clockwise` and `source`. A filled-in default draws the same as a missing one.
- **Every note gets a fresh `d` whenever any annotation changes**, since the whole array is resolved again. A component that copies from `d` in an `$effect` would run it on every change to any note. That is why `EditableText` copies the text into its `draft` inside the handler that starts the edit, and nowhere else.

The editor's `{#each}` is keyed by `d.id`, so a component stays with its note. The static `{#each}` has no key: a published config may leave ids out or repeat them.

## One drag lifecycle

Every press-move-release in the editor goes through `drag()` in `modules/drag.js`. It returns a Svelte attachment, made once in a component's `<script>` and put on an element with `{@attach}`:

```javascript
const dragBox = drag({ moving, pointer: k.pointer, onstart, onmove, onend });
```

- `onstart(e)` runs on a press of the primary button. It returns where the dragged thing sits right now, or nothing to turn the drag down.
- `onmove(pos)` is told where the dragged thing should sit: the pointer, minus the gap between the pointer and the thing that was remembered at the press. So nothing jumps under the cursor on the first move.
- `onend({ moved, cancelled })` runs when the drag is over. **If `onstart` returned a position, `onend` is called exactly once**, however the drag ends.
- `pointer` says which space the three of them work in. It defaults to client pixels. Passing Layer Cake's `k.pointer` makes it chart pixels.

| Consumer                               | Space  | What `onstart` returns                                          |
| -------------------------------------- | ------ | --------------------------------------------------------------- |
| The box, in `AnnotationEditor`         | chart  | The anchor point, or null while the text is being edited        |
| `ArrowZone`, source handle             | chart  | Where the arrow leaves the box                                  |
| `ArrowZone`, target and create handles | chart  | Where the arrow points. A new arrow starts on the create handle |
| `ResizeHandles`, east                  | chart  | The right edge                                                  |
| `ResizeHandles`, west                  | chart  | The pointer's own x, so the left edge sits exactly under it     |
| `AnchorHandle`                         | client | The centre of the diamond as drawn                              |

What the lifecycle settles, so that no consumer has to:

- **One drag at a time.** `moving` is the lock. A handle inside the box hears the press first, as it bubbles up, and takes the lock. The box hears it next and stands down. No press needs `stopPropagation`.
- **A click is not a drag.** Nothing is reported until the pointer has travelled 3 pixels from the press. After that `moved` stays true for the rest of the gesture. `ArrowZone` saves only when `moved && !cancelled`, so a plain click on the create handle adds no arrow.
- **Every ending is heard.** A `pointerup` or `pointercancel` on the window, in the capture phase; `lostpointercapture` on the element; a context menu opened with a mouse, which swallows the release; and the element leaving the page mid-press, which the attachment's cleanup catches. `cancelled` is true for all of them but `pointerup`.
- **The lock can't stick.** `moving` is cleared before `onend` runs, so a consumer that throws while saving leaves the editor usable.
- **Svelte keeps the attachment for the life of the element.** Neither `drag()` nor the attachment reads reactive state, so nothing re-creates it in the middle of a drag. The callbacks read what they need when they are called. All per-drag state lives inside the attachment, one copy per element, because one attachment can sit on more than one element, as `ArrowZone`'s does on its target and create handles.

Pointer capture goes on whatever was pressed rather than on the element with the attachment, so a double click on the text inside the box still reports against the text.

`ResizeHandles` owns nothing but the gesture. It is given `left` and `width` in chart pixels, which come from `getBoxEdges` and so from the config, and reports `onresize({ left, width })`. It remembers both edges once at the press and works every move out from those: the parent stores a rounded width, so measuring from the live props would let the edge that is meant to hold still creep. `AnnotationEditor`'s `onresize` stores the width and, when the anchor has to move for the left edge to land where it was asked to, the new position, in one `modifyAnnotation`.

`touch-action: none` keeps a touch drag from scrolling the page. It sits on editor-only rules: `.draggable.canDrag` in `Editor.svelte`, and `.arrow-zone`, `.grabber` and `.anchor-indicator` in their own components.

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
Clear previewArrow first, so nothing the save does can leave it behind
    ↓
Convert pixels → data space → call setArrow() ← expensive, once
    ↓
Normal rendering resumes, with the saved arrow
```

**Benefits**:

1. **Performance**: No coordinate conversions during drag
2. **New arrows**: Can render arrow before it exists in data
3. **Clean rendering**: Hide saved arrow while preview renders (no double-render)
4. **Atomic commits**: Only persist on mouse release. A press that never became a drag, or a drag that was cancelled, saves nothing

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
// Defaults
resolveAnnotation(anno)        // An annotation with every default filled in, its arrows included
resolveArrow(arrow)            // An arrow with every default filled in
annotationWidth(anno)          // The one width predicate and the one default
DEFAULT_ANNOTATION_WIDTH       // 155
HANDLE_OFFSET_PX               // 12: how far a handle sits from the box's edge

// Config → pixels
getAnchorPoint(anno, k)        // The one point knowable from config alone
getBoxEdges(anno, k, anchor?)  // left, right, width - deliberately no top or bottom
getArrowSource(anno, arrow, k) // Where an arrow leaves its annotation
getArrowTarget(arrow, k)       // Where it points

// Pixels → what gets stored
calculateSourceDx(pixelX, anno, side, k) // An arrow's source.dx
calculateSourceDy(pixelY, anno, k)       // An arrow's source.dy
dataKeys(k)                    // { xKey, yKey }, or null when the accessors aren't keys
invertPoint(pixelX, pixelY, k) // { data, dx, dy } for an anchor point or an arrow target
```

Every one of these is a pure function of the config and the scales. None takes a measured dimension, which is what keeps published charts correct without a measurement pass. The geometry functions take resolved annotations and arrows (see Defaults are filled in once).

`invertPoint` leaves out an axis passed as null, so the caller's own value for it stands. A resize uses that to move only x. Callers merge what comes back over the data they have, `{ ...d.data, ...point.data }`, and skip the write when it is null.

### `invertScale.js`

Converts positions back to data values. Handles both linear and ordinal scales:

```javascript
const [dataValue, percentOffset] = invertScale(scale, pos, size, percentRange);
// For linear: percentOffset is always 0
// For ordinal: percentOffset is how far the position sits past the start of its band,
// as a percentage of the chart's width or height
```

`size` and `percentRange` are required because a chart with `percentRange` set has scales whose ranges run 0-100, while positions come off the page in pixels. Inverting a pixel against a percentage range doesn't throw, it just puts the annotation somewhere else.

### `ordinalInvert.js`

A band or point scale has no `invert`, so this finds the domain value whose band starts at or before the position, whichever way the range runs. A position ahead of every band, such as one in a padded scale's outer padding, gets the nearest band and a negative offset. A scale with anything in its domain always gives a value, so a drag can't store a null.

### `drag.js`

The press-move-release every handle shares. See One drag lifecycle.

### `noteText.js`

`DEFAULT_TEXT` is what a new note starts with. `finalText(draft)` is the text to store when an edit ends: an emptied note gets `DEFAULT_TEXT`, text that is only whitespace is kept as typed, which is how an arrow gets no label, and anything else is trimmed.

### `modifierKeys.js`

`hasCmdOrCtrl(e)` is true when the shortcut key is held: Cmd on macOS, Ctrl on Windows and Linux. Alignment and curve cycling read `hasCmdOrCtrl(e) && !e.altKey`, the anchor presets read `e.altKey && !hasCmdOrCtrl(e)`, and a double click with either held doesn't open the text for editing.

### `arrowUtils.js`

Generates SVG arc paths:

```
createArrowPath(source, target, clockwise, angle)
// Returns: "M 100,50 a 75,75 0 0,1 100,50"
```

## Data Flow

### Creating an annotation

```
Click on the .note-listener layer that covers the chart
    ↓
onListenerClick() passes over a click that ended a text edit,
and the second click of a double click
    ↓
addAnnotation(x, y) builds it with newAnnotation(), which uses invertPoint()
    ↓
Push to annotations array (reactive)
    ↓
AnnotationEditor renders at click position
    ↓
save() hands the config over a second later
```

Enter on the focused layer goes through `onListenerKeydown()` and puts the note in the middle of the chart.

### Editing a note's text

```
Double-click the text, or press Enter on it
    ↓
startEdit(): draft = text, then editing.value = id
    ↓
AnnotationEditor's isEditable turns true → EditableText swaps in the edit box
    ↓
editSession attachment: take focus, select all, listen for a click outside
    ↓
Enter, Escape, Tab or a click outside → blur → endEdit()
    ↓
editing.value = null, then onSave(finalText(draft)) if the text changed
    ↓
modifyAnnotation(id, { text })
```

Text flows one way. `EditableText` is given `text` and types into its own `draft`. The note's text changes only through `onSave`. `endEdit()` also runs from the `editSession` cleanup, because Firefox and Safari send no blur when a focused element is removed, and it is safe to call twice.

### Creating an arrow

```
Hover annotation → ArrowZone handles appear
    ↓
Press the create handle → drag() calls dragTarget's onstart(), which sets previewArrow
    ↓
onmove() updates previewArrow (pixels)
    ↓
Arrows.svelte renders dragPath
    ↓
Release → onend() clears previewArrow
    ↓
After a real drag: invertPoint() → setArrow()
    ↓
Arrow now in annotation.arrows
```

### Toggling arrow curve direction

```
Cmd+click (Ctrl+click on Windows and Linux) on an arrow handle
    ↓
East cycle: clockwise → null (straight) → counter-clockwise. West runs the other way
    ↓
modifyArrow(id, side, { clockwise: newValue })
    ↓
Arrow re-renders with new curve
```

### Deleting

```
Hover a note or an arrow handle → hovering.value says which
    ↓
Delete or Backspace reaches Editor's onkeydown() on the window
    ↓
Passed over when the key repeats, or when it is typed into an input,
a textarea, a select or anything contenteditable, anywhere on the page
    ↓
Hovering the box → deleteAnnotation(id)
Hovering a source or target handle → deleteArrow(id, side)
Hovering the create handle → nothing
    ↓
hovering.value = null
```

## Testing

Four layers, because screenshots alone can't catch a misplaced arrow or a key that deletes the wrong thing:

- `tests/unit/` - the pure modules, run under node: geometry and defaults, band scale inversion, note text, the shortcut key
- `tests/geometry.test.js` - where arrows and handles sit at non-zero anchors, and when handles show
- `tests/interaction.test.js` - sequences of presses, keys and drags, and what is on the chart afterwards
- `tests/annotations.test.js` - screenshots, linear and ordinal charts

`drag.js` needs a browser, so the interaction tests cover it rather than the unit tests.

The screenshots alone can't catch arrow misplacement: every scenario they cover sits at `anchorY` 0, where the anchor term drops out and wrong maths still looks right. That is what `tests/geometry.test.js` is for.

Run with:

```bash
pnpm test                                    # Run tests
pnpm exec playwright test --update-snapshots # Update baselines
```
