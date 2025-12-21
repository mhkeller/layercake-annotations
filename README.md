# LayerCake Annotations

Add interactive text annotations with swoopy arrows to [LayerCake](https://layercake.graphics) charts.

## Installation

```sh
pnpm add @mhkeller/layercake-annotations
```

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

**Creating arrows:**
- Hover over annotation to reveal handles on west/east edges
- Drag a handle outward to create an arrow
- Cmd+click arrow to cycle through: curved clockwise → straight → curved counter-clockwise

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `annotations` | `Annotation[]` | `[]` | Array of annotation objects (bindable) |
| `editable` | `boolean` | `true` | Enable editing. Set `false` for read-only display |

## Annotation Data Structure

```js
{
  id: 0,                           // Unique identifier
  date: new Date('2024-03-15'),    // X value (matches LayerCake x accessor)
  value: 42,                       // Y value (matches LayerCake y accessor)
  dx: 5,                           // X offset: percentage of chart width (-100 to 100)
  dy: -10,                         // Y offset: percentage of chart height (-100 to 100)
  text: 'Peak value',              // Annotation text
  width: '120px',                  // Optional: fixed width
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

### Arrow structure

```js
{
  side: 'east',                    // 'west' or 'east' - which side of annotation
  clockwise: true,                 // true = clockwise curve, false = counter-clockwise, null = straight
  source: { 
    dx: 12,                        // Pixels from annotation edge (horizontal)
    dy: 15                         // Pixels from annotation center (vertical)
  },
  target: { 
    date: new Date('2024-03-15'),  // X data value (matches LayerCake x accessor)
    value: 42,                     // Y data value
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
      date: new Date('2024-06-01'),
      value: 150,
      dx: 2,
      dy: -8,
      text: 'Summer peak',
      width: '100px',
      arrows: [{
        side: 'west',
        clockwise: false,
        source: { dx: -12, dy: 0 },
        target: { date: new Date('2024-06-01'), value: 150, dx: 0, dy: 0 }
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
import type { Annotation, Arrow } from '@mhkeller/layercake-annotations/types';
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
