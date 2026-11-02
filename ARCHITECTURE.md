# Architecture

This document explains the internal architecture and design decisions of LayerCake Annotations.

## Overview

LayerCake Annotations adds interactive text annotations with swoopy arrows to LayerCake charts. It supports both **edit mode** (interactive) and **static mode** (read-only). `AnnotationsEditor` adds its own controls on top: a colored outline (the frame) around the plotting area, and a tab in its corner with an Editable checkbox that switches between the two modes and a Copy button that copies the annotations as JavaScript.

## Component Hierarchy

```
Annotations.svelte              # AnnotationsEditor in dev, Static in a production build
│
AnnotationsEditor.svelte        # EditFrame, plus Editor or Static as its checkbox says
├── Editor.svelte               # Edit mode: state management, context providers
│   ├── ArrowheadMarker.svelte        # the arrowhead, in the SVG layer's defs
│   ├── Arrows.svelte                 # SVG arrow rendering
│   └── AnnotationEditor.svelte (×N)
│       ├── AnnotationBox.svelte      # the positioned box
│       │   ├── EditableText.svelte   # stands in for the plain text
│       │   ├── ResizeHandles.svelte
│       │   └── AnchorHandle.svelte   # drag the anchor point
│       └── ArrowZone.svelte (×2: west, east)
│
├── Static.svelte               # Read-only mode
│   ├── ArrowheadMarker.svelte
│   ├── Arrows.svelte
│   └── AnnotationBox.svelte (×N)     # the same box, holding plain text
│
└── EditFrame.svelte            # The frame, and its tab: the Editable switch and Copy
```

Four of these are exported:

- `Annotations`, for most users: `AnnotationsEditor` while they place notes, `AnnotationsStatic` in a production build;
- `AnnotationsEditor`, the editor with its frame in every build, for an app that edits on the published site;
- `Editor.svelte`, as `AnnotationsEditorPlain`, the same editor without the frame, for a page that wants its own checkbox and Copy button;
- `Static.svelte`, as `AnnotationsStatic`, for published charts.

`AnnotationsEditorPlain` has no `editable` prop. A page that wants editing off swaps it for `AnnotationsStatic` itself, which also keeps it clear that the editor ships wherever `AnnotationsEditorPlain` is used. (In 1.x `Editor.svelte` was exported as `AnnotationsEditor`, a name that now means the version with controls.)

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
- `hovering` is set by `AnnotationEditor` for the box and by `ArrowZone` for its handles. Something is hovered once it has been pointed at: the mouse moved over it, or focus reached it. A `mousemove` sets it rather than a `mouseenter`, because the browser also reports an enter when the page changes under a mouse that is holding still, like a deleted note uncovering the one beneath it. `Editor` clears it after a delete, and an `AnnotationEditor` that is destroyed while hovered clears it on the way out, so the Delete key never finds a hover pointing at a note that is gone.
- `moving` is written only by `drag.js`. Hover handlers do nothing while it is true, so the hover holds for the whole drag.

`Editor` also reads one key it doesn't set: `saveAnnotationConfig`, a save function an app can put in context above the chart. See Saving below.

### Writes go by id

Every change to the config goes through a function in `Editor.svelte`, which works on the bound `annotations` array: `addAnnotation`, `deleteAnnotation`, `modifyAnnotation`, and for arrows `setArrow`, `modifyArrow` and `deleteArrow`. The three arrow functions are one-liners over `updateArrows(id, fn)`, which replaces an annotation's `arrows` with what `fn` makes of them. An annotation has at most one arrow per side, so `setArrow` replaces the arrow on that side where it sits, or adds it.

A new note's id is the next one up from the ids in the array at that moment, so it stays unique when the parent swaps the whole array.

### Saving

Each of those writes ends in `save()`. When there is somewhere to send the config, it calls `send`, which waits until a second has passed with no further writes. When it fires it takes `$state.snapshot(annos)`, a plain copy rather than the live state, and sends it to the first of two places. The `onsave` prop is handed the config as JavaScript text from `serializeAnnotations`, then the copy. The `saveAnnotationConfig` function from context is handed the copy alone: it belongs to an app that mounts a chart it didn't write, and that app checks the data and writes it out itself. With neither, nothing waits and nothing is sent. The config leaves the editor only when someone asks for it, through the frame's Copy button or a page's own button built on `serializeAnnotations`. `Editor` runs a waiting save straight away when it is destroyed, which is what happens when `editable` goes false.

`saveTo(file)` is an `onsave` the package provides. It posts `{ file, source }` to a route the Vite plugin in `vite.js` adds to the dev server, and the plugin writes `export default <source>;` into the file. The plugin has `apply: 'serve'`, so a build never includes it. It writes only for a request whose `Origin` is the dev server's own host, and only to an existing file inside the root that matches `include`. Before writing, it parses the whole file it is about to write with Vite's `parseAst`. It must be a single `export default` of data: the JSON values plus `new Date("…")` and `new Date(NaN)`, which is everything `serializeAnnotations` writes. The dev server runs the file, on the server too when it renders a page, so this check is what keeps a request that gets past the origin check from putting code there. One way past it is DNS rebinding when the app sets `server.allowedHosts: true`. It remembers what it last wrote to each file. When the watcher reports a change whose contents match that, its `hotUpdate` hook returns no modules, so the page is not updated and a note being typed in stays open. Vite marks the file's modules stale before `hotUpdate` runs, so the next load, on the client or in server rendering, reads the new file. A hand edit doesn't match, so it updates the page as usual.

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

## The frame

The frame is the colored outline `AnnotationsEditor` draws around the plotting area, and the tab is the small box in its top-right corner that holds the Editable checkbox and the Copy button. Both live in `EditFrame.svelte`.

`AnnotationsEditor` is a thin wrapper that renders `<EditFrame bind:editable {annotations} />`, then `Editor` or `Static` as `editable` says. When the checkbox changes `editable`, it swaps one for the other. The frame sits outside that swap, so it stays on screen in both modes. Switching editing off destroys `Editor`, and `Editor` sends any save still waiting when it is destroyed, so no edit is lost. The frame comes first in the markup, so the notes paint over its border, and the checkbox and Copy come first in Tab order.

`EditFrame` is its own Layer Cake layer, `<Html pointerEvents={false}>`, so it lies over the chart without catching clicks meant for it. Only the tab takes clicks. The border sits at `inset: -4px`, just outside the area where a click adds a note.

**Keeping the tab above the notes.** The tab has `z-index: 2` and the notes' container, `.layercake-annotations`, has `z-index: 1`, so the tab stays clickable even with a note dragged under it. The cost, which we accept, is that a note placed in the top-right corner goes partly under the tab. This works only because of a Layer Cake detail. Browsers compare `z-index` values only within the same stacking context, a group that the browser layers as one unit. Layer Cake's `Html` layer sets no `z-index`, so it doesn't start a stacking context, and the tab and the notes, though in different layers, are compared directly. If a future Layer Cake gave its layers a `z-index`, `transform` or similar, each layer would be layered as a whole, and the notes' layer, which comes later, would cover the tab. No test checks this.

**Copy.** The button reads `serializeAnnotations($state.snapshot(annotations))` first, then writes that text to the clipboard. If a note's text is being edited, that edit has already ended by the time Copy runs: see Editing a note's text. Browsers only provide `navigator.clipboard` on https or localhost, and can refuse the write. In either case Copy logs the text to the console once, and the button says See console. Nothing touches `navigator` while rendering, so the frame works with server rendering.

**The Copied label.** After a copy the button says Copied, and goes back to Copy after the next edit, with no timer. The label is `$derived`: it says Copied only while the copied text still equals `serializeAnnotations` of the current annotations, so any edit that changes them changes the label.

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
4. **Production builds**: `Annotations` picks `AnnotationsEditor` or `Static` on `DEV` from `esm-env`, which a bundler resolves to the constant `true` or `false` through the `development` and `production` export conditions. It works with any bundler that sets those conditions, which `import.meta.env.DEV` would not. In a build the editor branch is dead code and the minifier removes it along with the editor.

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
- **A lazy `import()` of the editor.** Measured with Vite 8 and Rolldown, SvelteKit and Chromium, it still ships about 1.5 KB gzipped. An `{#await}` version makes SvelteKit link the editor's CSS on every page. It breaks plain-Rollup single-file builds, and makes single-file and IIFE embeds about 10% bigger. The static switch in `Annotations` leaves out more.
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

`invertPoint` leaves out an axis passed as null, so the caller's own value for it stands. A resize uses that to move only x. `AnnotationEditor` merges what comes back over the note's own data, `{ ...d.data, ...point.data }`. A new note and an arrow target pass both axes and store the result whole. Every caller skips the write when it is null.

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

### `serializeAnnotations.js`

`serializeAnnotations(config)` writes the config as JavaScript text. It follows `JSON.stringify(config, null, 2)` for the plain objects, arrays, strings, numbers, booleans and nulls a config holds, and with no dates in the config the two are the same text. The one difference is a `Date`: JSON turns it into a string, and a time scale can't place a string, so it is written as `new Date("…")`. That makes the text something to paste into a chart or import from a `.js` file, not something to `JSON.parse`. The frame's Copy button and `onsave` both hand out this text, and the package exports the function for a page that builds its own Copy button.

### `noteText.js`

`DEFAULT_TEXT` is what a new note starts with. `finalText(draft)` is the text to store when an edit ends: an emptied note gets `DEFAULT_TEXT`, text that is only whitespace is kept as typed, which is how an arrow gets no label, and anything else is trimmed.

### `modifierKeys.js`

`hasCmdOrCtrl(e)` is true when the shortcut key is held: Cmd on macOS, Ctrl on Windows and Linux. Alignment and curve cycling read it, and a double click with it held doesn't open the text for editing.

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
editSession attachment: take focus, select all, listen for a click outside,
in the capture phase
    ↓
Enter, Escape, Tab or a click outside → blur → endEdit()
    ↓
editing.value = null, then onSave(finalText(draft)) if the text changed
    ↓
modifyAnnotation(id, { text })
```

Text flows one way. `EditableText` is given `text` and types into its own `draft`. The note's text changes only through `onSave`. `endEdit()` also runs from the `editSession` cleanup, because Firefox and Safari send no blur when a focused element is removed, and it is safe to call twice.

The listener for a click outside runs in the capture phase, before any other handler on the page, so a button that reads the annotations, like the frame's Copy, gets the typed text. In Chrome a pressed button takes focus, and the blur ends the edit before the click. Safari and Firefox on macOS don't focus a clicked button, so the click is what ends it. A handler that stops the click's propagation can't keep the edit open either. The layer that adds notes still passes over a click that ended an edit: it notes the edit at `pointerdown`, before the click.

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
Move the mouse over a note or an arrow handle, or focus it → hovering.value says which
    ↓
Delete or Backspace reaches Editor's onkeydown() on the window
    ↓
Passed over when the key repeats, or when it lands in something
that takes typing, anywhere on the page
    ↓
Hovering the box → deleteAnnotation(id)
Hovering a source or target handle → deleteArrow(id, side)
Hovering the create handle → nothing
    ↓
hovering.value = null, until the mouse moves or focus lands again
```

`takesTyping` says what takes typing: a textarea, a select, anything contenteditable, and an `<input>` of any type not in `PRESSED_INPUTS`. That list holds the types that are pressed rather than typed into, like checkbox, radio and button. One of those keeps focus after a click, as the frame's Editable switch does, and Backspace still belongs to the chart. The list names what is pressed, so an input type it doesn't know counts as typing and keeps its key.

## Testing

Six layers, because screenshots alone can't catch a misplaced arrow, a key that deletes the wrong thing, a save that goes to the wrong place, or a Copy that copies the wrong text:

- `tests/unit/` - the pure modules, run under node: geometry and defaults, band scale inversion, a new note, note text, the shortcut key, the config as JavaScript text
- `tests/geometry.test.js` - where arrows and handles sit at non-zero anchors, and when handles show
- `tests/interaction.test.js` - sequences of presses, keys and drags, and what is on the chart afterwards
- `tests/save.test.js` - who is told about a save, what they are handed, and when. It runs on a page of its own, `src/routes/fixtures/save`, which mounts a chart the way a host app would and takes its case from the query string. `ui=frame` swaps the page's own checkbox, `AnnotationsEditorPlain` and `AnnotationsStatic` for `AnnotationsEditor`
- `tests/switch.test.js` - `Annotations` on the dev server, on `src/routes/fixtures/switch`: the framed editor, and `hideTools` swapping it for the static notes and back. What a production build drops is not tested, since it is the bundler's doing
- `tests/saveFile.test.js` - `saveTo` and the Vite plugin, on `src/routes/fixtures/file`: an edit written to the file without a hot update, and a reload showing it
- `tests/frame.test.js` - `AnnotationsEditor`'s tab, on the save fixture with `ui=frame`: what Copy puts on the clipboard, the label going back to Copy after an edit, the console when there is no clipboard, Copy during an open text edit, and the frame following the switch
- `tests/annotations.test.js` - screenshots, linear and ordinal charts

`drag.js` needs a browser, so the interaction tests cover it rather than the unit tests.

The screenshots alone can't catch arrow misplacement: every scenario they cover sits at `anchorY` 0, where the anchor term drops out and wrong maths still looks right. That is what `tests/geometry.test.js` is for.

Run with:

```bash
pnpm test                                    # Run tests
pnpm exec playwright test --update-snapshots # Update baselines
```
