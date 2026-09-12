# LayerCake Annotations

Add interactive text annotations with swoopy arrows to [LayerCake](https://layercake.graphics) charts.

## Installation

```sh
pnpm add layercake@^11 @mhkeller/layercake-annotations
```

Requires Layer Cake 11 and Svelte 5.40 or newer. `layercake` is a peer
dependency, so install it yourself and pin the major — a bare `layercake` will
pick up the next major the day it ships.

## Quick Start

```svelte
<script>
  import { LayerCake } from 'layercake';
  import { Annotations } from '@mhkeller/layercake-annotations';

  let annotations = $state([]);
</script>

<LayerCake data={data} x="date" y="value">
  <Annotations bind:annotations />
</LayerCake>
```

**Creating annotations:**
- Click anywhere on the chart to create
- Drag to reposition
- Double-click text to edit
- Hover + Delete/Backspace to remove

**Editing text:**
- Double-click to edit
- Enter to save
- Shift+Enter for line breaks
- Escape to cancel

**Formatting:**
- Cmd+click annotation to cycle text alignment: left → center → right

**Moving the anchor point:**
- Hover an annotation to show its anchor as a small diamond
- Drag the diamond to put the anchor anywhere in the box
- Option+click the annotation to jump between nine presets, clockwise from top-left
- Arrow keys nudge it 5% at a time once the diamond has focus

**Creating arrows:**
- Hover over annotation to reveal handles on west/east edges
- Drag a handle outward to create an arrow
- Cmd+click arrow to cycle through: curved clockwise → straight → curved counter-clockwise

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `annotations` | `Annotation[]` | `[]` | Array of annotation objects (bindable) |
| `editable` | `boolean` | `true` | Enable editing. Set `false` for read-only display |

**Note:** The `annotations` prop uses Svelte 5's `$bindable` for two-way binding. For edits to persist, the parent component must store annotations in a `$state` variable:

```svelte
let annotations = $state([]);             // ✓ edits persist
let annotations = [];                     // ✗ edits won't persist
import annotations from 'annotations.js'  // ✗ edits won't persist
```

## Annotation Data Structure

```js
{
  id: 0,                           // Unique identifier
  data: {
    date: new Date('2024-03-15'),  // X value (matches LayerCake x accessor)
    value: 42                      // Y value (matches LayerCake y accessor)
  },
  dx: 5,                           // X offset: percentage of chart width (-100 to 100)
  dy: -10,                         // Y offset: percentage of chart height (-100 to 100)
  text: 'Peak value',              // Annotation text (supports line breaks)
  width: '120px',                  // Optional: fixed width
  align: 'left',                   // Optional: 'left', 'center', or 'right'
  anchorX: 0,                      // Optional: anchor X position (0-100% of width)
  anchorY: 0,                      // Optional: anchor Y position (0-100% of height)
  style: 'background: yellow;',    // Optional: inline CSS styles
  class: 'highlight',              // Optional: CSS class name(s)
  arrows: []                       // Array of arrows (see below)
}
```

### Offsets explained

The `dx` and `dy` values are **percentages of the chart dimensions** (not decimals 0–1).

| Value | Meaning |
|-------|---------|
| `dx: 0` | Annotation left edge aligned with data point |
| `dx: 10` | Shifted right by 10% of chart width |
| `dx: -5` | Shifted left by 5% of chart width |
| `dy: -15` | Shifted up by 15% of chart height |

### Anchor point

The `anchorX` and `anchorY` properties define where the data point "pins" to the annotation box. In edit mode, hovering an annotation shows the anchor as a small diamond. Drag it to put the anchor anywhere in the box, Option+click the annotation to jump between the presets below, or nudge it with the arrow keys. The annotation stays where it is while the anchor moves — `dx` and `dy` are adjusted to make up the difference.

| anchorX | anchorY | Result |
|---------|---------|--------|
| `0` | `0` | Top-left anchored (default) |
| `50` | `50` | Center anchored |
| `100` | `0` | Top-right anchored |
| `50` | `100` | Bottom-center anchored |

Dragging reaches any value in between. The Option+click cycle visits these nine.

### Arrow structure

An arrow's `source.dx` is pixels from the near edge of the annotation, and its
`source.dy` is pixels down from the **anchor point**. The two use different
origins on purpose: the box's width is stored in the config, so its edges are
known, but its height comes out of how the text wraps, so the anchor point is
the only vertical position that can be worked out without measuring the page.
That is what lets a published chart draw its arrows correctly without measuring
anything.

To put an arrow at the middle or the bottom of the box, move the anchor there
with `anchorY` and leave `source.dy` at 0. The browser resolves `anchorY`
against the real box, so it keeps working when the text re-wraps.

```js
{
  side: 'east',                    // 'west' or 'east' - which side of annotation
  clockwise: true,                 // true = clockwise curve, false = counter-clockwise, null = straight
  source: {
    dx: 12,                        // Pixels from the near edge of the annotation
    dy: 15                         // Pixels down from the anchor point
  },
  target: {
    data: {
      date: new Date('2024-03-15'),  // X data value (matches LayerCake x accessor)
      value: 42                      // Y data value
    },
    dx: 0,                         // % offset for ordinal X scales (0-100)
    dy: 0                          // % offset for ordinal Y scales (0-100)
  }
}
```

## Full Example

```svelte
<script>
  import { LayerCake, Svg, Html } from 'layercake';
  import { Annotations } from '@mhkeller/layercake-annotations';
  import Line from './Line.svelte';

  let data = [...];
  let annotations = $state([
    {
      id: 0,
      data: {
        date: new Date('2024-06-01'),
        value: 150
      },
      dx: 2,
      dy: -8,
      text: 'Summer peak',
      width: '100px',
      arrows: [{
        side: 'west',
        clockwise: false,
        source: { dx: -12, dy: 0 },
        target: {
          data: { date: new Date('2024-06-01'), value: 150 },
          dx: 0,
          dy: 0
        }
      }]
    }
  ]);

  let editable = $state(true);
</script>

<label>
  <input type="checkbox" bind:checked={editable} /> Edit mode
</label>

<div class="chart-container">
  <LayerCake {data} x="date" y="value">
    <Svg><Line /></Svg>
    <Annotations bind:annotations {editable} />
  </LayerCake>
</div>
```

## TypeScript

```ts
import type { Annotation, Arrow } from '@mhkeller/layercake-annotations';
```

## Components

| Export | Description |
|--------|-------------|
| `Annotations` | Main component – set `editable` prop to toggle modes |
| `AnnotationsEditor` | Edit mode only |
| `AnnotationsStatic` | Read-only mode only |

## Development

```sh
pnpm install
pnpm dev          # Start dev server at localhost:5173
pnpm test         # Run Playwright visual regression tests
pnpm package      # Build for npm distribution
```

## Architecture

```
src/lib/
├── Annotations.svelte        # Wrapper: switches Editor/Static based on editable
├── Editor.svelte             # Edit mode: state management, context providers
├── Static.svelte             # Read-only: renders annotations + arrows
├── components/
│   ├── AnchorHandle          # Diamond handle for dragging the anchor point
│   ├── AnnotationEditor      # Draggable annotation with text editing
│   ├── AnnotationsData       # Static annotation renderer
│   ├── ArrowZone             # Handles for creating/editing arrows
│   ├── Arrows                # SVG arrow path rendering
│   ├── Draggable             # Drag behavior wrapper
│   ├── EditableText          # Contenteditable text input
│   └── ResizeHandles         # Width resize handles
├── modules/
│   ├── coordinates.js        # Position calculations
│   ├── invertScale.js        # Pixel → data value conversion
│   └── arrowUtils.js         # SVG arc path generation
└── types.d.ts                # TypeScript definitions
```

## Internals

For contributors working on this library.

### State Management

State is shared via Svelte context using the `createRef` pattern:

| Key | Type | Description |
|-----|------|-------------|
| `hovering` | `HoverState \| null` | Currently hovered element |
| `moving` | `boolean` | Whether dragging is in progress |
| `isEditing` | `boolean` | Whether text is being edited |
| `previewArrow` | `DragState \| null` | Live arrow during drag |
| `modifyAnnotation` | `function` | Update annotation props |
| `setArrow` | `function` | Create/update arrow |
| `modifyArrow` | `function` | Modify arrow properties |

### Key Modules

- **coordinates.js** - Centralizes position calculations (`getAnnotationBox`, `getArrowSource`, `getArrowTarget`)
- **arrowUtils.js** - Generates SVG arc paths
- **invertScale.js** - Converts pixel coordinates back to data values

### Adding a New Arrow Property

1. Update `Arrow` type in `types.d.ts`
2. Update `setArrow` in `Editor.svelte`
3. Update `ArrowZone.svelte` to read/write the property
4. Update `Arrows.svelte` if it affects rendering

### Debugging Coordinate Issues

1. Check that `coordinates.js` functions are used consistently
2. Verify the correct `scales` object is being passed
3. For east arrows, remember `dx` is from the RIGHT edge
4. `source.dy` is measured from the anchor point, not from the top of the box
