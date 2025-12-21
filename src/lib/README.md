# LayerCake Annotations - Internal Architecture

This document describes the internal architecture of the annotation library for contributors and maintainers.

## Overview

LayerCake Annotations provides interactive text annotations with swoopy arrows for [LayerCake](https://layercake.graphics/) charts. It supports both linear and ordinal scales.

## Component Structure

```
src/lib/
├── Editor.svelte           # Interactive editing mode (exported as AnnotationsEditor)
├── Static.svelte           # Read-only display mode (exported as AnnotationsStatic)
├── components/
│   ├── AnnotationEditor.svelte  # Individual annotation wrapper
│   ├── ArrowZone.svelte         # Draggable arrow handles
│   ├── Arrows.svelte            # SVG arrow rendering
│   ├── Draggable.svelte         # Generic drag behavior
│   ├── EditableText.svelte      # Editable text input
│   ├── ResizeHandles.svelte     # Width resize handles
│   ├── ArrowheadMarker.svelte   # SVG arrowhead definition
│   └── AnnotationsData.svelte   # Static annotations renderer
└── modules/
    ├── coordinates.js      # Shared coordinate calculations
    ├── arrowUtils.js       # SVG path generation
    ├── createRef.svelte.js # Reactive state refs for context
    ├── invertScale.js      # Scale inversion utilities
    ├── ordinalInvert.js    # Ordinal scale inversion
    ├── filterObject.js     # Object utilities
    └── newAnnotation.js    # Annotation factory
```

## Data Model

### Annotation Object

```typescript
{
  id: number,              // Unique identifier
  [xKey]: any,             // X data value (key from LayerCake config)
  [yKey]: any,             // Y data value (key from LayerCake config)
  dx: number,              // X offset: -100 to 100 (percentage of chart width)
  dy: number,              // Y offset: -100 to 100 (percentage of chart height)
  text: string,            // Annotation text (supports line breaks)
  width?: string,          // Box width (e.g., "150px")
  alignment?: string,      // Text alignment: 'left', 'center', or 'right'
  arrows: Arrow[]          // Attached arrows
}
```

**Note**: `dx` and `dy` are percentages (not decimals). Use `dx: 10` for 10% right, `dx: -5` for 5% left.

### Arrow Object

```typescript
{
  side: 'west' | 'east',   // Which side of annotation the arrow originates from
  clockwise: boolean|null, // true = clockwise arc, false = counter-clockwise, null = straight
  source: {
    dx: number,            // Pixels from annotation edge (neg = further out)
    dy: number             // Pixels from annotation vertical center
  },
  target: {
    [xKey]: any,           // X data value (same accessor as LayerCake)
    [yKey]: any,           // Y data value
    dx?: number,           // 0-100: % offset within ordinal band (X)
    dy?: number            // 0-100: % offset within ordinal band (Y)
  }
}
```

## Coordinate System

The library uses multiple coordinate systems:

### Annotation Position

```
Final position = scale(dataValue) + (dx/100 × chartDimension)
```

| Property | Unit | Range | Example |
|----------|------|-------|---------|
| `[xKey]` | Data value | Depends on data | `new Date('2024-01-15')` |
| `[yKey]` | Data value | Depends on data | `42` |
| `dx` | % of chart width | -100 to 100 | `5` = 5% right |
| `dy` | % of chart height | -100 to 100 | `-10` = 10% up |

### Arrow Source Position

Pixels relative to annotation box edge:

| Property | Unit | Meaning |
|----------|------|---------|
| `source.dx` | Pixels | Distance from annotation edge (west: left edge, east: right edge) |
| `source.dy` | Pixels | Distance from annotation vertical center |

### Arrow Target Position

| Property | Unit | When used |
|----------|------|-----------|
| `[xKey]`, `[yKey]` | Data values | Always (same keys as LayerCake config) |
| `dx`, `dy` | % within band (0-100) | Only for ordinal scales |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Double-click | Edit annotation text |
| Enter | Save text and exit edit mode |
| Shift+Enter | Insert line break while editing |
| Escape | Cancel editing |
| Cmd+click | Cycle text alignment: left → center → right |
| Delete/Backspace | Delete hovered annotation or arrow |
| Cmd+click on arrow | Toggle curve direction: clockwise → straight → counter-clockwise |

## State Management

State is shared via Svelte context using the `createRef` pattern:

```javascript
// In Editor.svelte
const hovering = createRef(null);
setContext('hovering', hovering);

// In child components
const hovering = getContext('hovering');
hovering.value = { annotationId: 0, type: 'body' };
```

### Context Values

| Key | Type | Description |
|-----|------|-------------|
| `hovering` | `HoverState \| null` | Currently hovered element |
| `moving` | `boolean` | Whether dragging is in progress |
| `isEditing` | `boolean` | Whether text is being edited |
| `previewArrow` | `DragState \| null` | Live arrow during drag |
| `modifyAnnotation` | `function` | Update annotation props |
| `setArrow` | `function` | Create/update arrow |
| `modifyArrow` | `function` | Modify arrow properties |

## Key Modules

### coordinates.js

Centralizes all coordinate calculations to prevent drift:

```javascript
import { 
  getAnnotationBox,    // Get annotation position/size
  getArrowSource,      // Get arrow source in pixels
  getArrowTarget,      // Get arrow target in pixels
  calculateSourceDx,   // Convert pixel to stored offset
  DEFAULT_ANNOTATION_WIDTH
} from './modules/coordinates.js';
```

### arrowUtils.js

Generates SVG arc paths:

```javascript
import { createArrowPath } from './modules/arrowUtils.js';

const path = createArrowPath(
  { x: 100, y: 50 },   // source
  { x: 200, y: 100 },  // target
  true,                // clockwise
  Math.PI / 2          // angle (optional)
);
```

## Testing

Tests use Playwright for visual regression testing:

```bash
pnpm test                              # Run tests
pnpm exec playwright test --update-snapshots  # Update snapshots
```

Tests cover both linear scale (`/`) and ordinal scale (`/ordinal`) examples.

## Common Tasks

### Adding a new arrow property

1. Update `Arrow` type in `types.d.ts`
2. Update `setArrow` in `Editor.svelte` to handle the property
3. Update `ArrowZone.svelte` to read/write the property
4. Update `Arrows.svelte` if it affects rendering

### Debugging coordinate issues

1. Check that `coordinates.js` functions are being used consistently
2. Verify the correct `scales` object is being passed
3. For east arrows, remember `dx` is from the RIGHT edge

