# LayerCake Annotations

Add interactive text annotations with swoopy arrows to [LayerCake](https://layercake.graphics) charts.

## Installation

```sh
pnpm add @mhkeller/layercake-annotations
```

**Peer dependencies:** Svelte 5, LayerCake 8+

## Usage

### Basic (editable)

```svelte
<script>
  import { LayerCake } from 'layercake';
  import { Annotations } from '@mhkeller/layercake-annotations';

  let annotations = $state([]);
</script>

<LayerCake data={data} x="date" y="value">
  <Annotations bind:annotations editable={true} />
</LayerCake>
```

Click anywhere on the chart to create an annotation. Drag to reposition. Hover and press Delete/Backspace to remove.

### Static (read-only)

```svelte
<Annotations {annotations} editable={false} />
```

### With existing annotations

```svelte
<script>
  let annotations = $state([
    {
      id: 0,
      date: new Date('2024-03-15'),  // x value (matches your LayerCake x accessor)
      value: 42,                      // y value (matches your LayerCake y accessor)
      dx: 5,                          // % offset from data point
      dy: -10,
      text: 'Peak value',
      width: '120px',
      arrows: [
        {
          side: 'east',
          clockwise: true,
          source: { dx: 12, dy: 15 },  // pixels from annotation edge
          target: { date: new Date('2024-03-15'), value: 42, dx: 0, dy: 0 }
        }
      ]
    }
  ]);
</script>
```

### Creating arrows

1. Hover over an annotation to reveal arrow handles (west/east edges)
2. Drag a handle to create an arrow pointing to a data point
3. Shift+click the arrow handle to toggle clockwise/counter-clockwise curve
4. Drag existing arrow endpoints to reposition

## Components

| Component | Description |
|-----------|-------------|
| `Annotations` | Main component with `editable` prop to toggle edit/static mode |
| `AnnotationsEditor` | Editor-only (always editable) |
| `AnnotationsStatic` | Static-only (read-only display) |

## Types

```ts
import type { Annotation, Arrow } from '@mhkeller/layercake-annotations/types';
```

### Annotation

```ts
interface Annotation {
  id: number;
  [xKey: string]: unknown;  // x data value (key from LayerCake config)
  [yKey: string]: unknown;  // y data value
  dx: number;               // % offset in x direction
  dy: number;               // % offset in y direction
  text: string;
  width?: string;           // e.g., "150px"
  arrows: Arrow[];
}
```

### Arrow

```ts
interface Arrow {
  side: 'west' | 'east';
  clockwise: boolean | null;  // null = straight line
  source: { dx: number; dy: number };  // pixel offset from annotation
  target: { [xKey]: unknown; [yKey]: unknown; dx?: number; dy?: number };
}
```

## Architecture

```
src/lib/
├── Annotations.svelte      # Main wrapper (switches Editor/Static based on `editable`)
├── Editor.svelte           # Edit mode: manages state, keyboard events, context
├── Static.svelte           # Read-only mode: just renders annotations + arrows
├── components/
│   ├── AnnotationEditor.svelte  # Single annotation: draggable + editable text + resize
│   ├── AnnotationsData.svelte   # Static annotation renderer
│   ├── ArrowZone.svelte         # Arrow creation/editing handles
│   ├── Arrows.svelte            # SVG arrow path rendering
│   ├── Draggable.svelte         # Generic drag behavior
│   ├── EditableText.svelte      # Contenteditable text input
│   └── ResizeHandles.svelte     # Width resize handles
├── modules/
│   ├── coordinates.js      # Coordinate calculations (annotation box, arrow positions)
│   ├── invertScale.js      # Convert pixels → data values (linear + ordinal)
│   ├── arrowUtils.js       # SVG arc path generation
│   └── createRef.svelte.js # Reactive reference wrapper for context
└── types.d.ts              # TypeScript definitions
```

### Coordinate system

- **Annotations** are positioned in **data space** (using LayerCake's xScale/yScale)
- **dx/dy offsets** are **percentages** of chart dimensions
- **Arrow source** uses **pixel offsets** from annotation edge
- **Arrow target** is in **data space** with optional percentage offsets (for ordinal scales)

### State management

Editor mode uses Svelte context to share:
- `hovering` – which annotation/arrow handle is hovered
- `moving` – whether a drag is in progress
- `previewArrow` – live arrow coordinates during drag
- `modifyAnnotation`, `setArrow`, `modifyArrow` – mutation functions

## Development

```sh
pnpm install
pnpm dev          # Start dev server
pnpm test         # Run Playwright tests
pnpm package      # Build for distribution
```
